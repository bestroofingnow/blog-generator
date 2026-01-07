// pages/api/billing/webhook.ts
// Stripe webhook handler for subscription events

import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";
import {
  db,
  organizations,
  overagePurchases,
  creditTransactions,
  eq,
} from "../../../lib/db";
import { stripe, SUBSCRIPTION_TIERS, getTierConfig, TierKey } from "../../../lib/stripe";

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handleOveragePayment(paymentIntent);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

// Handle checkout session completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  const tier = session.metadata?.tier as TierKey;

  if (!organizationId) {
    console.error("[Webhook] No organizationId in checkout metadata");
    return;
  }

  console.log(`[Webhook] Checkout completed for org ${organizationId}, tier: ${tier}`);

  // The subscription update will be handled by customer.subscription.created event
}

// Handle subscription create/update
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    // Try to find by customer ID
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripeCustomerId, subscription.customer as string))
      .limit(1);

    if (!org[0]) {
      console.error("[Webhook] Cannot find organization for subscription");
      return;
    }

    await updateOrganizationSubscription(org[0].id, subscription);
    return;
  }

  await updateOrganizationSubscription(organizationId, subscription);
}

// Update organization subscription details
async function updateOrganizationSubscription(
  organizationId: string,
  subscription: Stripe.Subscription
) {
  const tier = subscription.metadata?.tier as TierKey || "starter";
  const tierConfig = getTierConfig(tier);

  const status = mapStripeStatus(subscription.status);

  // Get the current period start from subscription - handle API version differences
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = subscription as any;
  const periodStart = subData.current_period_start
    ? new Date(subData.current_period_start * 1000)
    : new Date();

  await db
    .update(organizations)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionTier: tier,
      subscriptionStatus: status,
      monthlyCredits: tierConfig.monthlyCredits,
      maxTeamMembers: tierConfig.maxTeamMembers,
      billingCycleStart: periodStart,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  console.log(`[Webhook] Updated org ${organizationId}: tier=${tier}, status=${status}`);

  // If subscription just became active, allocate initial credits
  if (status === "active") {
    await db.insert(creditTransactions).values({
      organizationId,
      amount: tierConfig.monthlyCredits,
      type: "monthly_allocation",
      description: `Initial credit allocation: ${tierConfig.monthlyCredits} credits (${tierConfig.name} tier)`,
    });
  }
}

// Handle subscription cancellation
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);

  if (!org[0]) {
    console.error("[Webhook] Cannot find organization for canceled subscription");
    return;
  }

  await db
    .update(organizations)
    .set({
      subscriptionStatus: "canceled",
      subscriptionTier: "free",
      monthlyCredits: 0,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org[0].id));

  console.log(`[Webhook] Subscription canceled for org ${org[0].id}`);
}

// Handle successful payment (for subscription renewal)
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceData = invoice as any;
  if (!invoiceData.subscription) return; // Not a subscription invoice

  const customerId = invoiceData.customer as string;

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);

  if (!org[0]) return;

  // Reset credits for new billing cycle
  const tierConfig = getTierConfig(org[0].subscriptionTier || "starter");

  // Calculate rollover (max 50% of monthly credits)
  const monthlyRemaining = Math.max(0, (org[0].monthlyCredits || 0) - (org[0].creditsUsed || 0));
  const maxRollover = Math.floor(tierConfig.monthlyCredits * 0.5);
  const newRollover = Math.min(monthlyRemaining, maxRollover);

  await db
    .update(organizations)
    .set({
      creditsUsed: 0,
      rolloverCredits: newRollover,
      billingCycleStart: new Date(),
      subscriptionStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org[0].id));

  // Record the monthly allocation
  await db.insert(creditTransactions).values({
    organizationId: org[0].id,
    amount: tierConfig.monthlyCredits,
    type: "monthly_allocation",
    description: `Monthly renewal: ${tierConfig.monthlyCredits} credits`,
  });

  if (newRollover > 0) {
    await db.insert(creditTransactions).values({
      organizationId: org[0].id,
      amount: newRollover,
      type: "rollover",
      description: `Rolled over ${newRollover} unused credits`,
    });
  }

  console.log(`[Webhook] Payment succeeded, reset credits for org ${org[0].id}`);
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceData = invoice as any;
  if (!invoiceData.subscription) return;

  const customerId = invoiceData.customer as string;

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);

  if (!org[0]) return;

  await db
    .update(organizations)
    .set({
      subscriptionStatus: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org[0].id));

  console.log(`[Webhook] Payment failed for org ${org[0].id}`);
}

// Handle overage credit purchase
async function handleOveragePayment(paymentIntent: Stripe.PaymentIntent) {
  const organizationId = paymentIntent.metadata?.organizationId;
  const credits = parseInt(paymentIntent.metadata?.credits || "0");
  const userId = paymentIntent.metadata?.userId;

  if (!organizationId || !credits) {
    // Not an overage purchase
    return;
  }

  // Create overage purchase record
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiration

  await db.insert(overagePurchases).values({
    organizationId,
    userId,
    creditsPurchased: credits,
    creditsRemaining: credits,
    pricePaid: paymentIntent.amount,
    stripePaymentIntentId: paymentIntent.id,
    expiresAt,
    status: "active",
  });

  // Add to organization's overage credits
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (org[0]) {
    await db
      .update(organizations)
      .set({
        overageCredits: (org[0].overageCredits || 0) + credits,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  }

  // Record transaction
  await db.insert(creditTransactions).values({
    organizationId,
    userId,
    amount: credits,
    type: "purchase",
    description: `Purchased ${credits} overage credits`,
    expiresAt,
  });

  console.log(`[Webhook] Overage purchase: ${credits} credits for org ${organizationId}`);
}

// Map Stripe subscription status to our status
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "trialing" | "past_due" | "canceled" | "unpaid" {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    default:
      return "unpaid";
  }
}

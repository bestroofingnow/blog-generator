// lib/stripe.ts
// Stripe configuration and utilities

import Stripe from "stripe";

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Subscription tier configurations
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: "Starter",
    monthlyCredits: 200,
    priceMonthly: 3900, // $39.00 in cents
    priceAnnual: 39000, // $390.00 in cents (2 months free)
    maxTeamMembers: 3,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || "",
    features: [
      "200 credits per month",
      "Blog generation",
      "Image generation",
      "AI research",
      "Up to 3 team members",
      "30-day credit rollover",
    ],
  },
  pro: {
    name: "Pro",
    monthlyCredits: 600,
    priceMonthly: 9900, // $99.00 in cents
    priceAnnual: 99000, // $990.00 in cents (2 months free)
    maxTeamMembers: 3,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "",
    stripeAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",
    features: [
      "600 credits per month",
      "Everything in Starter",
      "Priority support",
      "Advanced analytics",
      "Up to 3 team members",
      "30-day credit rollover",
    ],
  },
  agency: {
    name: "Agency",
    monthlyCredits: 2000,
    priceMonthly: 29900, // $299.00 in cents
    priceAnnual: 299000, // $2,990.00 in cents (2 months free)
    maxTeamMembers: -1, // Unlimited
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID || "",
    stripeAnnualPriceId: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID || "",
    features: [
      "2,000 credits per month",
      "Everything in Pro",
      "Unlimited team members",
      "White-label options",
      "Dedicated account manager",
      "Custom integrations",
    ],
  },
} as const;

export type BillingPeriod = "monthly" | "annual";

// Overage credit packages
export const OVERAGE_PACKAGES = {
  small: {
    credits: 40,
    priceInCents: 1000, // $10.00
    stripePriceId: process.env.STRIPE_OVERAGE_SMALL_PRICE_ID || "",
  },
  large: {
    credits: 100,
    priceInCents: 2000, // $20.00
    stripePriceId: process.env.STRIPE_OVERAGE_LARGE_PRICE_ID || "",
  },
} as const;

export type TierKey = keyof typeof SUBSCRIPTION_TIERS;
export type OveragePackageKey = keyof typeof OVERAGE_PACKAGES;

// Get tier configuration by name
export function getTierConfig(tier: string) {
  return SUBSCRIPTION_TIERS[tier as TierKey] || SUBSCRIPTION_TIERS.starter;
}

// Calculate credit costs
export const CREDIT_COSTS = {
  blog_generation: 1,
  image_generation: 1,
  ai_research: 1,
} as const;

// Create a Stripe Checkout session for subscription
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
  });

  return session;
}

// Create a Stripe Checkout session for one-time overage purchase
export async function createOverageCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });

  return session;
}

// Create or get a Stripe customer
export async function getOrCreateCustomer({
  email,
  name,
  organizationId,
}: {
  email: string;
  name?: string;
  organizationId: string;
}) {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
    },
  });

  return customer;
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("[Stripe] Error retrieving subscription:", error);
    return null;
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Update subscription to a new tier
export async function updateSubscription(subscriptionId: string, newPriceId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });
}

// Create billing portal session for customer self-service
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Construct webhook event
export function constructWebhookEvent(payload: Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

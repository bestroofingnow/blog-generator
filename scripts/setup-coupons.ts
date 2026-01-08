// scripts/setup-coupons.ts
// One-time script to create Stripe coupons and promotion codes
// Run with: npx ts-node scripts/setup-coupons.ts

import Stripe from "stripe";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Trim to handle any trailing newlines in the env var
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || "").trim();

if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY is not set in .env.local");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-12-15.clover",
});

interface CouponConfig {
  couponId: string;
  promoCode: string;
  name: string;
  percentOff: number;
  duration: "forever" | "repeating" | "once";
  durationInMonths?: number;
  maxRedemptions?: number;
  trialDays?: number; // For display purposes - actual trial handled in checkout
}

const COUPONS: CouponConfig[] = [
  {
    couponId: "KYX90_COUPON",
    promoCode: "KYX90",
    name: "KYX90 - 90% off for 3 months",
    percentOff: 90,
    duration: "repeating",
    durationInMonths: 3,
    maxRedemptions: 5,
  },
  {
    couponId: "KYXTRIAL_COUPON",
    promoCode: "KYXTRIAL",
    name: "KYXTRIAL - Trial + 30% off",
    percentOff: 30,
    duration: "forever",
    trialDays: 30,
  },
  {
    couponId: "FOUNDBLOGGER_COUPON",
    promoCode: "FOUNDBLOGGER",
    name: "FOUNDBLOGGER - Founder 70% off",
    percentOff: 70,
    duration: "forever",
    trialDays: 30,
  },
];

async function createCoupon(config: CouponConfig): Promise<string | null> {
  try {
    // Check if coupon already exists
    try {
      const existing = await stripe.coupons.retrieve(config.couponId);
      console.log(`  Coupon ${config.couponId} already exists`);
      return existing.id;
    } catch {
      // Coupon doesn't exist, create it
    }

    const couponParams: Stripe.CouponCreateParams = {
      id: config.couponId,
      percent_off: config.percentOff,
      duration: config.duration,
      name: config.name,
    };

    if (config.duration === "repeating" && config.durationInMonths) {
      couponParams.duration_in_months = config.durationInMonths;
    }

    const coupon = await stripe.coupons.create(couponParams);
    console.log(`  Created coupon: ${coupon.id}`);
    return coupon.id;
  } catch (error) {
    console.error(`  Error creating coupon ${config.couponId}:`, error);
    return null;
  }
}

async function createPromotionCode(config: CouponConfig, couponId: string): Promise<void> {
  try {
    // Check if promotion code already exists
    const existingCodes = await stripe.promotionCodes.list({
      code: config.promoCode,
      limit: 1,
    });

    if (existingCodes.data.length > 0) {
      console.log(`  Promotion code ${config.promoCode} already exists`);
      return;
    }

    const promoParams: Stripe.PromotionCodeCreateParams = {
      promotion: {
        type: "coupon",
        coupon: couponId,
      },
      code: config.promoCode,
      active: true,
    };

    if (config.maxRedemptions) {
      promoParams.max_redemptions = config.maxRedemptions;
    }

    // Add metadata for trial days (used by checkout.ts)
    if (config.trialDays) {
      promoParams.metadata = {
        trial_days: config.trialDays.toString(),
      };
    }

    const promoCode = await stripe.promotionCodes.create(promoParams);
    console.log(`  Created promotion code: ${promoCode.code}`);
  } catch (error) {
    console.error(`  Error creating promotion code ${config.promoCode}:`, error);
  }
}

async function main() {
  console.log("Setting up Stripe coupons and promotion codes...\n");

  for (const config of COUPONS) {
    console.log(`Processing ${config.promoCode}:`);

    const couponId = await createCoupon(config);
    if (couponId) {
      await createPromotionCode(config, couponId);
    }

    console.log("");
  }

  console.log("Setup complete!");
  console.log("\nCoupon codes available:");
  console.log("  - KYX90: 90% off for 3 months (max 5 redemptions)");
  console.log("  - KYXTRIAL: 30-day free trial + 30% off forever");
  console.log("  - FOUNDBLOGGER: 1 month free + 70% off forever");
}

main().catch(console.error);

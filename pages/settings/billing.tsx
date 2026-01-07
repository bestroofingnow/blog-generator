// pages/settings/billing.tsx
// Beautiful pricing and billing management page

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

interface CreditInfo {
  credits: {
    monthly: number;
    rollover: number;
    overage: number;
    total: number;
    used: number;
    remaining: number;
  };
  subscription: {
    tier: string;
    tierName: string;
    status: string;
    billingCycleStart: string | null;
  };
  lowCreditWarning: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string | null;
}

const TIER_DETAILS = {
  free: { name: "Free", priceMonthly: 0, priceAnnual: 0, credits: 0, features: [] as string[], popular: false },
  starter: {
    name: "Starter",
    priceMonthly: 39,
    priceAnnual: 390,
    credits: 200,
    popular: false,
    features: [
      "200 AI credits per month",
      "SEO-optimized blog generation",
      "AI image generation",
      "Keyword research tools",
      "Up to 3 team members",
      "30-day credit rollover",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    priceMonthly: 99,
    priceAnnual: 990,
    credits: 600,
    popular: true,
    features: [
      "600 AI credits per month",
      "Everything in Starter",
      "Priority support",
      "Advanced SEO analytics",
      "Competitor analysis",
      "Content calendar",
      "API access",
    ],
  },
  agency: {
    name: "Agency",
    priceMonthly: 299,
    priceAnnual: 2990,
    credits: 2000,
    popular: false,
    features: [
      "2,000 AI credits per month",
      "Everything in Pro",
      "Unlimited team members",
      "White-label options",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
};

type BillingPeriod = "monthly" | "annual";

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [buyingOverage, setBuyingOverage] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchCreditInfo = useCallback(async () => {
    try {
      setApiError(null);
      const res = await fetch("/api/billing/credits?history=true");
      const data = await res.json();
      if (data.success) {
        setCreditInfo(data.data);
        setTransactions(data.data.history || []);
      } else {
        console.error("API error:", data.error, "Status:", res.status);
        setApiError(data.error || `API returned status ${res.status}`);
      }
    } catch (error) {
      console.error("Failed to fetch credit info:", error);
      setApiError("Failed to connect to billing service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchCreditInfo();
    }
  }, [status, router, fetchCreditInfo]);

  useEffect(() => {
    if (router.query.success) {
      fetchCreditInfo();
    }
  }, [router.query, fetchCreditInfo]);

  const handleUpgrade = async (tier: string) => {
    setUpgrading(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billingPeriod }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
    } finally {
      setUpgrading(null);
    }
  };

  const handleBuyOverage = async (pkg: "small" | "large") => {
    setBuyingOverage(pkg);
    try {
      const res = await fetch("/api/billing/overage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Overage purchase error:", error);
      alert("Failed to purchase credits");
    } finally {
      setBuyingOverage(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.success && data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        alert(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  const currentTier = creditInfo?.subscription.tier || "free";
  const hasActiveSubscription = currentTier !== "free" && creditInfo?.subscription.status === "active";
  const isAnnual = billingPeriod === "annual";

  // Show beautiful pricing page for new users
  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Head>
          <title>Choose Your Plan | Kynex AI</title>
        </Head>

        {/* Header */}
        <header className="relative z-10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Kynex AI</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative px-6 pt-12 pb-8 text-center">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Early adopter badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-amber-200 text-sm font-medium">
                Early Adopter Special: <code className="bg-amber-500/20 px-2 py-0.5 rounded font-mono">EARLY50</code> for 50% off forever!
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Supercharge Your SEO Content
            </h1>
            <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
              AI-powered blog generation, keyword research, and SEO optimization.
              Create content that ranks in minutes, not hours.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-12">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-white text-slate-900 shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === "annual"
                    ? "bg-white text-slate-900 shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Annual
                <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-semibold">
                  2 months free
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="relative px-6 pb-20">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {Object.entries(TIER_DETAILS)
              .filter(([key]) => key !== "free")
              .map(([key, tier]) => {
                const displayPrice = isAnnual ? Math.round(tier.priceAnnual / 12) : tier.priceMonthly;
                const totalAnnual = tier.priceAnnual;
                const isPopular = tier.popular;

                return (
                  <div
                    key={key}
                    className={`relative rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] ${
                      isPopular
                        ? "bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20"
                        : "bg-white/5 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold shadow-lg">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">${displayPrice}</span>
                        <span className="text-white/50">/month</span>
                      </div>
                      {isAnnual && (
                        <p className="text-sm text-green-400 mt-1">
                          ${totalAnnual} billed annually
                        </p>
                      )}
                      <p className="text-white/60 mt-2">
                        {tier.credits.toLocaleString()} credits/month
                      </p>
                    </div>

                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={upgrading === key}
                      className={`w-full py-3 px-6 rounded-xl font-semibold transition-all mb-6 ${
                        isPopular
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/30"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {upgrading === key ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        "Get Started"
                      )}
                    </button>

                    <ul className="space-y-3">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-white/80 text-sm">
                          <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Trust Section */}
        <div className="px-6 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">10k+</p>
                <p className="text-white/50 text-sm">Blogs Generated</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-white/50 text-sm">Happy Users</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">98%</p>
                <p className="text-white/50 text-sm">Satisfaction Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">24/7</p>
                <p className="text-white/50 text-sm">AI Availability</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-white/40">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm">Secure Payments via Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-sm">Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-sm">Priority Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: "What are credits and how do they work?",
                  a: "Credits are used to generate content. Each blog post uses approximately 10-20 credits depending on length and complexity. Unused credits roll over for 30 days.",
                },
                {
                  q: "Can I upgrade or downgrade my plan?",
                  a: "Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your billing cycle.",
                },
                {
                  q: "What happens if I run out of credits?",
                  a: "You can purchase additional credit packs anytime, or upgrade to a higher tier plan for more monthly credits.",
                },
                {
                  q: "Is there a free trial?",
                  a: "We offer a 50% discount for early adopters using code EARLY50. This discount applies forever, not just the first month!",
                },
              ].map((faq, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-white font-medium mb-2">{faq.q}</h3>
                  <p className="text-white/60 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard for existing subscribers
  const tierDetails = TIER_DETAILS[currentTier as keyof typeof TIER_DETAILS] || TIER_DETAILS.free;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Billing & Credits | Settings</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/settings" className="text-indigo-600 hover:text-indigo-500 text-sm mb-2 inline-block">
            &larr; Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Credits</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and credit balance</p>
        </div>

        {/* Success Message */}
        {router.query.success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">Your subscription has been updated successfully!</p>
          </div>
        )}

        {/* API Error */}
        {apiError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              <strong>Error:</strong> {apiError}
            </p>
          </div>
        )}

        {/* Low Credit Warning */}
        {creditInfo?.lowCreditWarning && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Low Credits:</strong> You&apos;re running low on credits. Consider purchasing more or upgrading your plan.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>

            <div className="flex items-center justify-between mb-6 pb-6 border-b">
              <div>
                <p className="text-2xl font-bold text-gray-900">{tierDetails.name}</p>
                <p className="text-gray-500">
                  {tierDetails.priceMonthly > 0 ? `$${tierDetails.priceMonthly}/month` : "No active subscription"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Status:{" "}
                  <span
                    className={`capitalize ${
                      creditInfo?.subscription.status === "active" ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {creditInfo?.subscription.status || "none"}
                  </span>
                </p>
              </div>
              <button
                onClick={handleManageBilling}
                className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50"
              >
                Manage Billing
              </button>
            </div>

            {/* Credit Usage */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Credit Usage</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Monthly</p>
                  <p className="text-2xl font-bold text-gray-900">{creditInfo?.credits.monthly || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Used</p>
                  <p className="text-2xl font-bold text-gray-900">{creditInfo?.credits.used || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Rollover</p>
                  <p className="text-2xl font-bold text-gray-900">{creditInfo?.credits.rollover || 0}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-indigo-600">Remaining</p>
                  <p className="text-2xl font-bold text-indigo-600">{creditInfo?.credits.remaining || 0}</p>
                </div>
              </div>
            </div>

            {/* Overage Credits */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Need More Credits?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">40 Credits</p>
                      <p className="text-sm text-gray-500">$10.00 - Expires in 30 days</p>
                    </div>
                    <button
                      onClick={() => handleBuyOverage("small")}
                      disabled={buyingOverage === "small"}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {buyingOverage === "small" ? "..." : "Buy"}
                    </button>
                  </div>
                </div>
                <div className="border rounded-lg p-4 hover:border-indigo-300 transition-colors relative">
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Best Value
                  </span>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">100 Credits</p>
                      <p className="text-sm text-gray-500">$20.00 - Expires in 30 days</p>
                    </div>
                    <button
                      onClick={() => handleBuyOverage("large")}
                      disabled={buyingOverage === "large"}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {buyingOverage === "large" ? "..." : "Buy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleManageBilling}
                className="w-full py-3 px-4 text-left rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Manage Subscription</p>
                <p className="text-sm text-gray-500">Update payment, change plan</p>
              </button>
              <Link
                href="/settings/team"
                className="block w-full py-3 px-4 text-left rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Team Settings</p>
                <p className="text-sm text-gray-500">Invite members, manage access</p>
              </Link>
              <Link
                href="/"
                className="block w-full py-3 px-4 text-left rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Generate Content</p>
                <p className="text-sm text-gray-500">Start creating with AI</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            tx.type === "generation"
                              ? "bg-blue-100 text-blue-800"
                              : tx.type === "purchase"
                              ? "bg-green-100 text-green-800"
                              : tx.type === "monthly_allocation"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {tx.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{tx.description || "-"}</td>
                      <td
                        className={`px-4 py-3 text-sm text-right font-medium ${
                          tx.amount > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

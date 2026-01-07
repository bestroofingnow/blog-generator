// pages/settings/billing.tsx
// Billing and subscription management page

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  free: { name: "Free", priceMonthly: 0, priceAnnual: 0, credits: 0 },
  starter: { name: "Starter", priceMonthly: 39, priceAnnual: 390, credits: 200 },
  pro: { name: "Pro", priceMonthly: 99, priceAnnual: 990, credits: 600 },
  agency: { name: "Agency", priceMonthly: 299, priceAnnual: 2990, credits: 2000 },
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

  const fetchCreditInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/credits?history=true");
      const data = await res.json();
      if (data.success) {
        setCreditInfo(data.data);
        setTransactions(data.data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch credit info:", error);
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

  // Handle success/cancel from Stripe
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
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentTier = creditInfo?.subscription.tier || "free";
  const tierDetails = TIER_DETAILS[currentTier as keyof typeof TIER_DETAILS] || TIER_DETAILS.free;
  const isAnnual = billingPeriod === "annual";

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
                  Status: <span className={`capitalize ${
                    creditInfo?.subscription.status === "active" ? "text-green-600" : "text-yellow-600"
                  }`}>
                    {creditInfo?.subscription.status || "none"}
                  </span>
                </p>
              </div>
              {currentTier !== "free" && (
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50"
                >
                  Manage Billing
                </button>
              )}
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
                      disabled={buyingOverage === "small" || currentTier === "free"}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {buyingOverage === "small" ? "..." : "Buy"}
                    </button>
                  </div>
                </div>
                <div className="border rounded-lg p-4 hover:border-indigo-300 transition-colors relative">
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Best Value</span>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">100 Credits</p>
                      <p className="text-sm text-gray-500">$20.00 - Expires in 30 days</p>
                    </div>
                    <button
                      onClick={() => handleBuyOverage("large")}
                      disabled={buyingOverage === "large" || currentTier === "free"}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {buyingOverage === "large" ? "..." : "Buy"}
                    </button>
                  </div>
                </div>
              </div>
              {currentTier === "free" && (
                <p className="text-sm text-gray-500 mt-2">Subscribe to a plan to purchase additional credits.</p>
              )}
            </div>
          </div>

          {/* Upgrade Plans */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Choose Plan</h2>
              {/* Billing Period Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    billingPeriod === "monthly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("annual")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    billingPeriod === "annual"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Annual
                  <span className="ml-1 text-xs text-green-600 font-semibold">Save 17%</span>
                </button>
              </div>
            </div>

            {/* Promo Code Banner */}
            <div className="mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-3 text-white text-sm">
              <span className="font-semibold">Early Adopter Special:</span> Use code <code className="bg-white/20 px-1.5 py-0.5 rounded font-mono">EARLY50</code> for 50% off forever!
            </div>

            <div className="space-y-4">
              {Object.entries(TIER_DETAILS).filter(([key]) => key !== "free").map(([key, tier]) => {
                const displayPrice = isAnnual ? tier.priceAnnual : tier.priceMonthly;
                const monthlyEquivalent = isAnnual ? Math.round(tier.priceAnnual / 12) : tier.priceMonthly;
                const savings = isAnnual ? (tier.priceMonthly * 12) - tier.priceAnnual : 0;

                return (
                  <div
                    key={key}
                    className={`border rounded-lg p-4 ${
                      currentTier === key ? "border-indigo-500 bg-indigo-50" : "hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{tier.name}</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold text-gray-900">
                            ${displayPrice}
                          </p>
                          <span className="text-sm font-normal text-gray-500">
                            /{isAnnual ? "year" : "mo"}
                          </span>
                        </div>
                        {isAnnual && (
                          <p className="text-xs text-green-600 font-medium">
                            ${monthlyEquivalent}/mo · Save ${savings}/year
                          </p>
                        )}
                      </div>
                      {currentTier === key && (
                        <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Current</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{tier.credits} credits/month</p>
                    {currentTier !== key && (
                      <button
                        onClick={() => handleUpgrade(key)}
                        disabled={upgrading === key}
                        className="w-full py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 disabled:opacity-50"
                      >
                        {upgrading === key ? "Loading..." : currentTier === "free" ? "Subscribe" : "Switch Plan"}
                      </button>
                    )}
                  </div>
                );
              })}
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
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          tx.type === "generation" ? "bg-blue-100 text-blue-800" :
                          tx.type === "purchase" ? "bg-green-100 text-green-800" :
                          tx.type === "monthly_allocation" ? "bg-purple-100 text-purple-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {tx.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{tx.description || "-"}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        tx.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
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

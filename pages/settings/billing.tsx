// pages/settings/billing.tsx
// Billing dashboard and subscription management

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

interface Invoice {
  id: string;
  amount: number;
  status: string;
  date: string;
  pdfUrl: string | null;
}

interface SubscriptionDetails {
  tier: string;
  tierName: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyPrice: number;
  billingPeriod: "monthly" | "annual";
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  invoices: Invoice[];
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for individuals and small projects",
    monthlyPrice: 39,
    annualPrice: 390,
    credits: 200,
    popular: false,
    features: [
      { text: "200 AI credits per month", included: true },
      { text: "SEO-optimized blog generation", included: true },
      { text: "AI image generation", included: true },
      { text: "Keyword research tools", included: true },
      { text: "Up to 3 team members", included: true },
      { text: "30-day credit rollover", included: true },
      { text: "Email support", included: true },
      { text: "Priority support", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams and agencies",
    monthlyPrice: 99,
    annualPrice: 990,
    credits: 600,
    popular: true,
    features: [
      { text: "600 AI credits per month", included: true },
      { text: "SEO-optimized blog generation", included: true },
      { text: "AI image generation", included: true },
      { text: "Keyword research tools", included: true },
      { text: "Up to 3 team members", included: true },
      { text: "30-day credit rollover", included: true },
      { text: "Priority support", included: true },
      { text: "Advanced SEO analytics", included: true },
      { text: "API access", included: true },
    ],
  },
  {
    id: "agency",
    name: "Agency",
    description: "For large teams with advanced needs",
    monthlyPrice: 299,
    annualPrice: 2990,
    credits: 2000,
    popular: false,
    features: [
      { text: "2,000 AI credits per month", included: true },
      { text: "SEO-optimized blog generation", included: true },
      { text: "AI image generation", included: true },
      { text: "Keyword research tools", included: true },
      { text: "Unlimited team members", included: true },
      { text: "30-day credit rollover", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "White-label options", included: true },
      { text: "Custom integrations", included: true },
    ],
  },
];

type BillingPeriod = "monthly" | "annual";

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [buyingOverage, setBuyingOverage] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [apiError, setApiError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchCreditInfo = useCallback(async () => {
    try {
      setApiError(null);
      const res = await fetch("/api/billing/credits?history=true");
      const data = await res.json();
      if (data.success) {
        setCreditInfo(data.data);
      } else {
        setApiError(data.error || `API returned status ${res.status}`);
      }
    } catch (error) {
      console.error("Failed to fetch credit info:", error);
      setApiError("Failed to connect to billing service");
    }
  }, []);

  const fetchSubscriptionDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/subscription");
      const data = await res.json();
      if (data.subscription) {
        setSubscriptionDetails(data.subscription);
      }
    } catch (error) {
      console.error("Failed to fetch subscription details:", error);
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
      fetchSubscriptionDetails();
    }
  }, [status, router, fetchCreditInfo, fetchSubscriptionDetails]);

  useEffect(() => {
    if (router.query.success) {
      fetchCreditInfo();
      fetchSubscriptionDetails();
    }
  }, [router.query, fetchCreditInfo, fetchSubscriptionDetails]);

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
    setPortalLoading(true);
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
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Head>
          <title>Loading... | Kynex AI</title>
        </Head>
        <div style={{
          width: 48,
          height: 48,
          border: "3px solid #e2e8f0",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const currentTier = creditInfo?.subscription.tier || "free";
  const hasActiveSubscription = currentTier !== "free" && creditInfo?.subscription.status === "active";
  const isAnnual = billingPeriod === "annual";

  // Show pricing page for users without subscription
  if (!hasActiveSubscription) {
    return (
      <div className="pricing-page">
        <Head>
          <title>Choose Your Plan | Kynex AI</title>
        </Head>
        <style jsx global>{`
          .pricing-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .pricing-page::before {
            content: '';
            position: fixed;
            inset: 0;
            background:
              radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%);
            pointer-events: none;
          }
          .container { position: relative; max-width: 1400px; margin: 0 auto; padding: 0 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; }
          .logo { display: flex; align-items: center; gap: 12px; }
          .logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
          .logo-text { font-size: 1.5rem; font-weight: 700; }
          .sign-out { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); padding: 10px 20px; border-radius: 8px; cursor: pointer; }
          .sign-out:hover { background: rgba(255,255,255,0.15); color: white; }
          .hero { text-align: center; padding: 60px 0 40px; }
          .promo { display: inline-flex; align-items: center; gap: 10px; padding: 10px 20px; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 100px; margin-bottom: 32px; }
          .promo-dot { width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; animation: blink 1.5s infinite; }
          .promo-text { color: #fcd34d; font-size: 0.9rem; }
          .promo-code { background: rgba(251, 191, 36, 0.3); padding: 4px 10px; border-radius: 6px; font-family: monospace; font-weight: 700; }
          .title { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; margin-bottom: 20px; }
          .subtitle { font-size: 1.25rem; color: rgba(255,255,255,0.6); max-width: 600px; margin: 0 auto 48px; }
          .toggle { display: inline-flex; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 6px; }
          .toggle-btn { padding: 14px 32px; border-radius: 12px; border: none; background: transparent; color: rgba(255,255,255,0.6); font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
          .toggle-btn.active { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
          .save-badge { background: linear-gradient(135deg, #10b981, #059669); padding: 4px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 700; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; padding: 60px 0; max-width: 1200px; margin: 0 auto; }
          .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px 32px; position: relative; transition: all 0.3s; }
          .card:hover { transform: translateY(-8px); border-color: rgba(139, 92, 246, 0.3); }
          .card.popular { background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); border-color: rgba(139, 92, 246, 0.4); }
          .popular-badge { position: absolute; top: -1px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 8px 24px; border-radius: 0 0 12px 12px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
          .plan-name { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
          .plan-desc { color: rgba(255,255,255,0.5); font-size: 0.95rem; margin-bottom: 32px; }
          .price { font-size: 4rem; font-weight: 800; line-height: 1; }
          .price-period { font-size: 1.1rem; color: rgba(255,255,255,0.5); }
          .price-annual { color: #10b981; font-size: 0.9rem; margin-top: 4px; }
          .credits { display: inline-flex; align-items: center; gap: 8px; background: rgba(139, 92, 246, 0.15); padding: 10px 16px; border-radius: 10px; margin: 24px 0; font-weight: 600; color: #c4b5fd; }
          .cta { width: 100%; padding: 18px; border: none; border-radius: 14px; font-size: 1.1rem; font-weight: 700; cursor: pointer; margin-bottom: 32px; }
          .cta.primary { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
          .cta.secondary { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
          .cta:disabled { opacity: 0.6; cursor: not-allowed; }
          .features { list-style: none; padding: 0; margin: 0; }
          .feature { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.95rem; }
          .feature:last-child { border-bottom: none; }
          .feature.included { color: rgba(255,255,255,0.9); }
          .feature.excluded { color: rgba(255,255,255,0.3); }
          .feature-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          .feature-icon.check { background: rgba(16, 185, 129, 0.2); color: #10b981; }
          .feature-icon.x { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); }
          .spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; margin-right: 8px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>

        <div className="container">
          <header className="header">
            <div className="logo">
              <div className="logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="logo-text">Kynex AI</span>
            </div>
            <button className="sign-out" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </button>
          </header>

          <section className="hero">
            <div className="promo">
              <span className="promo-dot" />
              <span className="promo-text">
                Early Adopter: Use <span className="promo-code">EARLY50</span> for 50% off forever!
              </span>
            </div>
            <h1 className="title">Choose your plan</h1>
            <p className="subtitle">
              Generate SEO-optimized blogs, research keywords, and create stunning images with AI.
            </p>
            <div className="toggle">
              <button className={`toggle-btn ${billingPeriod === "monthly" ? "active" : ""}`} onClick={() => setBillingPeriod("monthly")}>
                Monthly
              </button>
              <button className={`toggle-btn ${billingPeriod === "annual" ? "active" : ""}`} onClick={() => setBillingPeriod("annual")}>
                Annual <span className="save-badge">Save 17%</span>
              </button>
            </div>
          </section>

          <section className="grid">
            {PLANS.map((plan) => {
              const price = isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
              return (
                <div key={plan.id} className={`card ${plan.popular ? "popular" : ""}`}>
                  {plan.popular && <div className="popular-badge">Most Popular</div>}
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-desc">{plan.description}</p>
                  <div>
                    <span className="price">${price}</span>
                    <span className="price-period">/month</span>
                    {isAnnual && <p className="price-annual">${plan.annualPrice} billed annually</p>}
                  </div>
                  <div className="credits">{plan.credits.toLocaleString()} credits/month</div>
                  <button
                    className={`cta ${plan.popular ? "primary" : "secondary"}`}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                  >
                    {upgrading === plan.id ? <><span className="spinner" />Processing...</> : "Get Started"}
                  </button>
                  <ul className="features">
                    {plan.features.map((f, i) => (
                      <li key={i} className={`feature ${f.included ? "included" : "excluded"}`}>
                        <span className={`feature-icon ${f.included ? "check" : "x"}`}>
                          {f.included ? "✓" : "×"}
                        </span>
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    );
  }

  // Billing Dashboard for subscribers
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return { bg: "#dcfce7", text: "#166534" };
      case "trialing": return { bg: "#dbeafe", text: "#1e40af" };
      case "past_due": return { bg: "#fef3c7", text: "#92400e" };
      case "canceled": return { bg: "#fee2e2", text: "#991b1b" };
      default: return { bg: "#f3f4f6", text: "#374151" };
    }
  };

  const statusColors = getStatusColor(subscriptionDetails?.status || "");

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Head>
        <title>Billing | Kynex AI</title>
      </Head>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/app" style={{ color: "#6366f1", fontSize: "0.875rem", textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", margin: 0 }}>Billing</h1>
          <p style={{ color: "#6b7280", marginTop: 4 }}>Manage your subscription and payment methods</p>
        </div>

        {/* Success message */}
        {router.query.success && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <p style={{ color: "#166534", margin: 0 }}>✓ Your subscription has been updated successfully!</p>
          </div>
        )}

        {/* Error message */}
        {apiError && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <p style={{ color: "#991b1b", margin: 0 }}>Error: {apiError}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24 }}>
          {/* Main Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Current Plan Card */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827", margin: "0 0 4px 0" }}>Current Plan</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827" }}>
                      {subscriptionDetails?.tierName || creditInfo?.subscription.tierName || "—"}
                    </span>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 100,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      background: statusColors.bg,
                      color: statusColors.text,
                    }}>
                      {subscriptionDetails?.status || creditInfo?.subscription.status || "—"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  style={{
                    padding: "10px 20px",
                    background: "#6366f1",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: portalLoading ? "not-allowed" : "pointer",
                    opacity: portalLoading ? 0.7 : 1,
                  }}
                >
                  {portalLoading ? "Loading..." : "Manage Subscription"}
                </button>
              </div>

              {subscriptionDetails?.cancelAtPeriodEnd && (
                <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <p style={{ color: "#92400e", margin: 0, fontSize: "0.875rem" }}>
                    ⚠️ Your subscription will cancel at the end of the billing period.
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: 16 }}>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0 0 4px 0" }}>Next billing date</p>
                  <p style={{ color: "#111827", fontWeight: 600, fontSize: "1.125rem", margin: 0 }}>
                    {formatDate(subscriptionDetails?.currentPeriodEnd || null)}
                  </p>
                </div>
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: 16 }}>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0 0 4px 0" }}>Amount</p>
                  <p style={{ color: "#111827", fontWeight: 600, fontSize: "1.125rem", margin: 0 }}>
                    {subscriptionDetails?.monthlyPrice ? formatCurrency(subscriptionDetails.monthlyPrice) : "—"}/mo
                  </p>
                </div>
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: 16 }}>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0 0 4px 0" }}>Billing period</p>
                  <p style={{ color: "#111827", fontWeight: 600, fontSize: "1.125rem", margin: 0, textTransform: "capitalize" }}>
                    {subscriptionDetails?.billingPeriod || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827", margin: 0 }}>Payment Method</h2>
                <button
                  onClick={handleManageBilling}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    color: "#6366f1",
                    border: "1px solid #6366f1",
                    borderRadius: 8,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Update
                </button>
              </div>

              {subscriptionDetails?.paymentMethod ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 32,
                    background: "#f3f4f6",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "#374151",
                    textTransform: "uppercase",
                  }}>
                    {subscriptionDetails.paymentMethod.brand}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, color: "#111827" }}>
                      •••• •••• •••• {subscriptionDetails.paymentMethod.last4}
                    </p>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                      Expires {subscriptionDetails.paymentMethod.expMonth}/{subscriptionDetails.paymentMethod.expYear}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#6b7280", margin: 0 }}>No payment method on file</p>
              )}
            </div>

            {/* Invoice History */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827", margin: "0 0 16px 0" }}>Invoice History</h2>

              {subscriptionDetails?.invoices && subscriptionDetails.invoices.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {subscriptionDetails.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 12,
                        borderRadius: 8,
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ color: "#6b7280", fontSize: "0.875rem", minWidth: 100 }}>
                          {formatDate(invoice.date)}
                        </span>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          textTransform: "capitalize",
                          background: invoice.status === "paid" ? "#dcfce7" : "#f3f4f6",
                          color: invoice.status === "paid" ? "#166534" : "#374151",
                        }}>
                          {invoice.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontWeight: 600, color: "#111827" }}>
                          ${invoice.amount.toFixed(2)}
                        </span>
                        {invoice.pdfUrl && (
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#6366f1", fontSize: "0.875rem", textDecoration: "none" }}
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#6b7280", margin: 0, textAlign: "center", padding: 24 }}>No invoices yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Credits Card */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827", margin: "0 0 16px 0" }}>Credits</h2>

              <div style={{ textAlign: "center", padding: "16px 0", marginBottom: 16 }}>
                <p style={{ fontSize: "3rem", fontWeight: 700, color: "#6366f1", margin: 0 }}>
                  {creditInfo?.credits.remaining || 0}
                </p>
                <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "4px 0 0 0" }}>credits remaining</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0 }}>Monthly</p>
                  <p style={{ fontWeight: 600, color: "#111827", margin: "4px 0 0 0" }}>{creditInfo?.credits.monthly || 0}</p>
                </div>
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0 }}>Used</p>
                  <p style={{ fontWeight: 600, color: "#111827", margin: "4px 0 0 0" }}>{creditInfo?.credits.used || 0}</p>
                </div>
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0 }}>Rollover</p>
                  <p style={{ fontWeight: 600, color: "#111827", margin: "4px 0 0 0" }}>{creditInfo?.credits.rollover || 0}</p>
                </div>
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: 0 }}>Overage</p>
                  <p style={{ fontWeight: 600, color: "#111827", margin: "4px 0 0 0" }}>{creditInfo?.credits.overage || 0}</p>
                </div>
              </div>

              {creditInfo?.lowCreditWarning && (
                <div style={{ background: "#fef3c7", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <p style={{ color: "#92400e", fontSize: "0.875rem", margin: 0 }}>⚠️ Running low on credits</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => handleBuyOverage("small")}
                  disabled={buyingOverage === "small"}
                  style={{
                    padding: 12,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>40 Credits</p>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>$10.00</p>
                  </div>
                  <span style={{ color: "#6366f1", fontWeight: 500 }}>
                    {buyingOverage === "small" ? "..." : "Buy"}
                  </span>
                </button>
                <button
                  onClick={() => handleBuyOverage("large")}
                  disabled={buyingOverage === "large"}
                  style={{
                    padding: 12,
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>100 Credits <span style={{ fontSize: "0.75rem", color: "#0369a1" }}>Best value</span></p>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>$20.00</p>
                  </div>
                  <span style={{ color: "#6366f1", fontWeight: 500 }}>
                    {buyingOverage === "large" ? "..." : "Buy"}
                  </span>
                </button>
              </div>
            </div>

            {/* Upgrade Options */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827", margin: "0 0 16px 0" }}>Change Plan</h2>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 16 }}>
                Upgrade or downgrade your subscription
              </p>
              <button
                onClick={handleManageBilling}
                style={{
                  width: "100%",
                  padding: 12,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                View Plans
              </button>
            </div>

            {/* Quick Links */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827", margin: "0 0 16px 0" }}>Quick Links</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/settings/team" style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  textDecoration: "none",
                  color: "#111827",
                  display: "block",
                }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>Team Settings</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>Manage members</p>
                </Link>
                <Link href="/app" style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  textDecoration: "none",
                  color: "#111827",
                  display: "block",
                }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>Generate Content</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>Start creating</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

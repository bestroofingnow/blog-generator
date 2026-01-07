// pages/settings/billing.tsx
// Premium pricing and billing management page

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [buyingOverage, setBuyingOverage] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [apiError, setApiError] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

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
      <div className="pricing-page">
        <Head>
          <title>Loading... | Kynex AI</title>
        </Head>
        <style jsx global>{`
          .pricing-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loader {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #8b5cf6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div className="loader" />
      </div>
    );
  }

  const currentTier = creditInfo?.subscription.tier || "free";
  const hasActiveSubscription = currentTier !== "free" && creditInfo?.subscription.status === "active";
  const isAnnual = billingPeriod === "annual";

  // Show premium pricing page for new users
  if (!hasActiveSubscription) {
    return (
      <div className="pricing-page">
        <Head>
          <title>Choose Your Plan | Kynex AI</title>
          <meta name="description" content="AI-powered SEO content generation. Choose the plan that fits your needs." />
        </Head>

        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          .pricing-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow-x: hidden;
          }

          .pricing-page::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
              radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(236, 72, 153, 0.1) 0%, transparent 40%);
            pointer-events: none;
            z-index: 0;
          }

          .pricing-container {
            position: relative;
            z-index: 1;
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 24px;
          }

          .pricing-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 0;
          }

          .logo {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .logo-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
          }

          .logo-text {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .sign-out-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: rgba(255,255,255,0.7);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.3s ease;
          }

          .sign-out-btn:hover {
            background: rgba(255,255,255,0.15);
            color: white;
          }

          .hero-section {
            text-align: center;
            padding: 60px 0 40px;
          }

          .promo-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
            border: 1px solid rgba(251, 191, 36, 0.4);
            border-radius: 100px;
            margin-bottom: 32px;
            animation: pulse-glow 2s ease-in-out infinite;
          }

          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); }
            50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.4); }
          }

          .promo-dot {
            width: 8px;
            height: 8px;
            background: #fbbf24;
            border-radius: 50%;
            animation: blink 1.5s ease-in-out infinite;
          }

          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          .promo-text {
            color: #fcd34d;
            font-size: 0.9rem;
            font-weight: 500;
          }

          .promo-code {
            background: rgba(251, 191, 36, 0.3);
            padding: 4px 10px;
            border-radius: 6px;
            font-family: monospace;
            font-weight: 700;
          }

          .hero-title {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .hero-subtitle {
            font-size: 1.25rem;
            color: rgba(255,255,255,0.6);
            max-width: 600px;
            margin: 0 auto 48px;
            line-height: 1.6;
          }

          .billing-toggle {
            display: inline-flex;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 6px;
            gap: 4px;
          }

          .toggle-btn {
            padding: 14px 32px;
            border-radius: 12px;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.6);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .toggle-btn.active {
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            color: white;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
          }

          .toggle-btn:hover:not(.active) {
            color: white;
            background: rgba(255,255,255,0.1);
          }

          .save-badge {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 4px 10px;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
            gap: 24px;
            padding: 60px 0;
            max-width: 1200px;
            margin: 0 auto;
          }

          .pricing-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            padding: 40px 32px;
            position: relative;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }

          .pricing-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .pricing-card:hover {
            transform: translateY(-8px);
            border-color: rgba(139, 92, 246, 0.3);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 60px rgba(139, 92, 246, 0.1);
          }

          .pricing-card:hover::before {
            opacity: 1;
          }

          .pricing-card.popular {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
            border-color: rgba(139, 92, 246, 0.4);
            transform: scale(1.02);
          }

          .pricing-card.popular:hover {
            transform: scale(1.02) translateY(-8px);
          }

          .popular-badge {
            position: absolute;
            top: -1px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            padding: 8px 24px;
            border-radius: 0 0 12px 12px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
          }

          .plan-header {
            margin-bottom: 32px;
          }

          .plan-name {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .plan-description {
            color: rgba(255,255,255,0.5);
            font-size: 0.95rem;
          }

          .plan-price {
            margin-bottom: 8px;
          }

          .price-amount {
            font-size: 4rem;
            font-weight: 800;
            line-height: 1;
            background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .price-period {
            font-size: 1.1rem;
            color: rgba(255,255,255,0.5);
            margin-left: 4px;
          }

          .price-annual {
            color: #10b981;
            font-size: 0.9rem;
            margin-top: 4px;
          }

          .credits-info {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(139, 92, 246, 0.15);
            padding: 10px 16px;
            border-radius: 10px;
            margin-bottom: 32px;
            font-weight: 600;
            color: #c4b5fd;
          }

          .cta-button {
            width: 100%;
            padding: 18px 32px;
            border: none;
            border-radius: 14px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 32px;
          }

          .cta-button.primary {
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            color: white;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
          }

          .cta-button.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5);
          }

          .cta-button.secondary {
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
          }

          .cta-button.secondary:hover {
            background: rgba(255,255,255,0.15);
          }

          .cta-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
          }

          .features-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 0.95rem;
          }

          .feature-item:last-child {
            border-bottom: none;
          }

          .feature-item.included {
            color: rgba(255,255,255,0.9);
          }

          .feature-item.excluded {
            color: rgba(255,255,255,0.3);
          }

          .feature-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .feature-icon.check {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
          }

          .feature-icon.x {
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.3);
          }

          .trust-section {
            padding: 60px 0;
            border-top: 1px solid rgba(255,255,255,0.05);
          }

          .trust-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 40px;
            max-width: 900px;
            margin: 0 auto 48px;
          }

          @media (max-width: 768px) {
            .trust-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .trust-item {
            text-align: center;
          }

          .trust-number {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .trust-label {
            color: rgba(255,255,255,0.5);
            font-size: 0.9rem;
            margin-top: 4px;
          }

          .trust-badges {
            display: flex;
            justify-content: center;
            gap: 32px;
            flex-wrap: wrap;
          }

          .trust-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255,255,255,0.4);
            font-size: 0.9rem;
          }

          .faq-section {
            padding: 60px 0 80px;
            max-width: 800px;
            margin: 0 auto;
          }

          .faq-title {
            text-align: center;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 40px;
          }

          .faq-item {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            padding: 24px 28px;
            margin-bottom: 16px;
            transition: all 0.3s ease;
          }

          .faq-item:hover {
            border-color: rgba(255,255,255,0.15);
          }

          .faq-question {
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: white;
          }

          .faq-answer {
            color: rgba(255,255,255,0.6);
            line-height: 1.6;
          }

          .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: inline-block;
            margin-right: 8px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <div className="pricing-container">
          {/* Header */}
          <header className="pricing-header">
            <div className="logo">
              <div className="logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="logo-text">Kynex AI</span>
            </div>
            <button className="sign-out-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </button>
          </header>

          {/* Hero Section */}
          <section className="hero-section">
            <div className="promo-badge">
              <span className="promo-dot" />
              <span className="promo-text">
                Early Adopter Special: Use code <span className="promo-code">EARLY50</span> for 50% off forever!
              </span>
            </div>

            <h1 className="hero-title">
              Choose the perfect plan<br />for your content needs
            </h1>
            <p className="hero-subtitle">
              Generate SEO-optimized blogs, research keywords, and create stunning images with AI.
              Scale your content production effortlessly.
            </p>

            <div className="billing-toggle">
              <button
                className={`toggle-btn ${billingPeriod === "monthly" ? "active" : ""}`}
                onClick={() => setBillingPeriod("monthly")}
              >
                Monthly
              </button>
              <button
                className={`toggle-btn ${billingPeriod === "annual" ? "active" : ""}`}
                onClick={() => setBillingPeriod("annual")}
              >
                Annual
                <span className="save-badge">Save 17%</span>
              </button>
            </div>
          </section>

          {/* Pricing Cards */}
          <section className="pricing-grid">
            {PLANS.map((plan) => {
              const price = isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`pricing-card ${plan.popular ? "popular" : ""}`}
                  onMouseEnter={() => setHoveredPlan(plan.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                >
                  {plan.popular && <div className="popular-badge">Most Popular</div>}

                  <div className="plan-header">
                    <h3 className="plan-name">{plan.name}</h3>
                    <p className="plan-description">{plan.description}</p>
                  </div>

                  <div className="plan-price">
                    <span className="price-amount">${price}</span>
                    <span className="price-period">/month</span>
                    {isAnnual && (
                      <p className="price-annual">
                        ${plan.annualPrice} billed annually (2 months free)
                      </p>
                    )}
                  </div>

                  <div className="credits-info">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {plan.credits.toLocaleString()} credits/month
                  </div>

                  <button
                    className={`cta-button ${plan.popular ? "primary" : "secondary"}`}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                  >
                    {upgrading === plan.id ? (
                      <>
                        <span className="spinner" />
                        Processing...
                      </>
                    ) : (
                      "Get Started"
                    )}
                  </button>

                  <ul className="features-list">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`feature-item ${feature.included ? "included" : "excluded"}`}>
                        <span className={`feature-icon ${feature.included ? "check" : "x"}`}>
                          {feature.included ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          )}
                        </span>
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          {/* Trust Section */}
          <section className="trust-section">
            <div className="trust-grid">
              <div className="trust-item">
                <div className="trust-number">10K+</div>
                <div className="trust-label">Blogs Generated</div>
              </div>
              <div className="trust-item">
                <div className="trust-number">500+</div>
                <div className="trust-label">Happy Users</div>
              </div>
              <div className="trust-item">
                <div className="trust-number">98%</div>
                <div className="trust-label">Satisfaction</div>
              </div>
              <div className="trust-item">
                <div className="trust-number">24/7</div>
                <div className="trust-label">AI Available</div>
              </div>
            </div>

            <div className="trust-badges">
              <div className="trust-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Secure Payments
              </div>
              <div className="trust-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Cancel Anytime
              </div>
              <div className="trust-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                Priority Support
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="faq-section">
            <h2 className="faq-title">Frequently Asked Questions</h2>

            <div className="faq-item">
              <h3 className="faq-question">What are credits and how do they work?</h3>
              <p className="faq-answer">
                Credits are used to generate content. Each blog post uses approximately 10-20 credits
                depending on length and complexity. Unused credits roll over for 30 days, so you never lose them.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Can I upgrade or downgrade my plan?</h3>
              <p className="faq-answer">
                Yes! You can change your plan at any time through the Stripe billing portal.
                Upgrades take effect immediately, and downgrades apply at the end of your billing cycle.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">What happens if I run out of credits?</h3>
              <p className="faq-answer">
                You can purchase additional credit packs anytime, or upgrade to a higher tier plan
                for more monthly credits. We also offer overage packs starting at just $10.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Is there a free trial?</h3>
              <p className="faq-answer">
                We offer a 50% discount for early adopters using code EARLY50. This discount
                applies forever, not just the first month! It&apos;s better than a trial.
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Show dashboard for existing subscribers
  const TIER_DETAILS: Record<string, { name: string; priceMonthly: number }> = {
    free: { name: "Free", priceMonthly: 0 },
    starter: { name: "Starter", priceMonthly: 39 },
    pro: { name: "Pro", priceMonthly: 99 },
    agency: { name: "Agency", priceMonthly: 299 },
  };

  const tierDetails = TIER_DETAILS[currentTier] || TIER_DETAILS.free;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Billing & Credits | Settings</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/settings" className="text-indigo-600 hover:text-indigo-500 text-sm mb-2 inline-block">
            &larr; Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Credits</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and credit balance</p>
        </div>

        {router.query.success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">Your subscription has been updated successfully!</p>
          </div>
        )}

        {apiError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800"><strong>Error:</strong> {apiError}</p>
          </div>
        )}

        {creditInfo?.lowCreditWarning && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Low Credits:</strong> You&apos;re running low. Consider purchasing more or upgrading.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>

            <div className="flex items-center justify-between mb-6 pb-6 border-b">
              <div>
                <p className="text-2xl font-bold text-gray-900">{tierDetails.name}</p>
                <p className="text-gray-500">
                  {tierDetails.priceMonthly > 0 ? `$${tierDetails.priceMonthly}/month` : "No active subscription"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Status: <span className={`capitalize ${creditInfo?.subscription.status === "active" ? "text-green-600" : "text-yellow-600"}`}>
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
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Best Value</span>
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
              <Link href="/settings/team" className="block w-full py-3 px-4 text-left rounded-lg border hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">Team Settings</p>
                <p className="text-sm text-gray-500">Invite members, manage access</p>
              </Link>
              <Link href="/" className="block w-full py-3 px-4 text-left rounded-lg border hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">Generate Content</p>
                <p className="text-sm text-gray-500">Start creating with AI</p>
              </Link>
            </div>
          </div>
        </div>

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
                      <td className={`px-4 py-3 text-sm text-right font-medium ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
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

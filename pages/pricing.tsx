// pages/pricing.tsx
// Public pricing page - the main landing page for the app

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
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

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const fetchCreditInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/credits");
      const data = await res.json();
      if (data.success) {
        setCreditInfo(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch credit info:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCreditInfo();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchCreditInfo]);

  useEffect(() => {
    if (router.query.success) {
      fetchCreditInfo();
    }
  }, [router.query, fetchCreditInfo]);

  const handleUpgrade = async (tier: string) => {
    if (status !== "authenticated") {
      // Redirect to login first
      signIn(undefined, { callbackUrl: `/?tier=${tier}` });
      return;
    }

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

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
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
          border: "3px solid rgba(255,255,255,0.2)",
          borderTopColor: "#8b5cf6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const isAnnual = billingPeriod === "annual";

  return (
    <div className="pricing-page">
      <Head>
        <title>Pricing | Kynex AI - AI-Powered SEO Content Generator</title>
        <meta name="description" content="Choose the perfect plan for your content needs. Generate SEO-optimized blogs, research keywords, and create stunning images with AI." />
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
        .logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .logo-text { font-size: 1.5rem; font-weight: 700; color: white; }
        .header-actions { display: flex; gap: 12px; }
        .btn-secondary { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.9); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500; text-decoration: none; }
        .btn-secondary:hover { background: rgba(255,255,255,0.15); color: white; }
        .btn-primary { background: linear-gradient(135deg, #8b5cf6, #6366f1); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; text-decoration: none; }
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
        .footer { text-align: center; padding: 48px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 48px; }
        .footer p { color: rgba(255,255,255,0.4); margin: 0; }
        .footer a { color: rgba(255,255,255,0.6); text-decoration: none; }
        .footer a:hover { color: white; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div className="container">
        <header className="header">
          <Link href="/" className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="logo-text">Kynex AI</span>
          </Link>
          <div className="header-actions">
            {status === "authenticated" ? (
              <>
                {creditInfo?.subscription.tier !== "free" && creditInfo?.subscription.status === "active" && (
                  <Link href="/app" className="btn-secondary">
                    Go to App
                  </Link>
                )}
                <button className="btn-secondary" onClick={() => signOut({ callbackUrl: "/" })}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">
                  Log in
                </Link>
                <Link href="/login" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="hero">
          <div className="promo">
            <span className="promo-dot" />
            <span className="promo-text">
              Early Adopter: Use <span className="promo-code">FOUNDBLOGGER</span> for 70% off + 1 month free!
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

        <footer className="footer">
          <p>
            Have questions? <a href="mailto:support@kynex.ai">Contact us</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

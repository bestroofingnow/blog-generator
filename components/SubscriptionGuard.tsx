// components/SubscriptionGuard.tsx
// Component to protect routes that require an active subscription

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

interface SubscriptionStatus {
  tier: string;
  status: string;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await fetch("/api/billing/credits");
        const data = await res.json();

        if (data.success && data.data?.subscription) {
          const sub = data.data.subscription;
          // Check if user has an active paid subscription
          const isActive = sub.status === "active" || sub.status === "trialing";
          const isPaid = sub.tier !== "free" && sub.tier !== "none";
          setHasSubscription(isActive && isPaid);
          setSubscription(sub);
        } else {
          setHasSubscription(false);
        }
      } catch (error) {
        console.error("Failed to check subscription:", error);
        setHasSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, []);

  // Show loading state while checking subscription
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid #e5e7eb",
              borderTopColor: "#667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p style={{ color: "#64748b", margin: 0 }}>Checking subscription...</p>
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // If no active subscription, show upgrade prompt
  if (!hasSubscription) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "1rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "3rem",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "2rem",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.75rem" }}>
            Subscription Required
          </h1>

          <p style={{ color: "#64748b", marginBottom: "1.5rem", lineHeight: "1.6" }}>
            To access Kynex AI&apos;s powerful SEO content generation tools, you&apos;ll need an active subscription.
          </p>

          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1.5rem",
              color: "white",
            }}
          >
            <p style={{ fontSize: "0.875rem", margin: "0 0 0.5rem", opacity: 0.9 }}>
              Early Adopter Special
            </p>
            <p style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>
              Use code <code style={{ background: "rgba(255,255,255,0.2)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>EARLY50</code> for 50% off forever!
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link
              href="/settings/billing"
              style={{
                display: "block",
                background: "#667eea",
                color: "white",
                padding: "0.875rem 1.5rem",
                borderRadius: "8px",
                fontWeight: "600",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              View Plans & Subscribe
            </Link>

            <Link
              href="/login"
              style={{
                display: "block",
                color: "#64748b",
                padding: "0.5rem",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

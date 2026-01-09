// components/SubscriptionGuard.tsx
// Component to protect routes that require an active subscription

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await fetch("/api/billing/credits");
        const data = await res.json();

        if (data.success && data.data?.subscription) {
          const sub = data.data.subscription;
          // Super admins always have access
          if (sub.tier === "superadmin") {
            setHasSubscription(true);
            return;
          }
          // Check if user has an active paid subscription
          const isActive = sub.status === "active" || sub.status === "trialing";
          const isPaid = sub.tier !== "free" && sub.tier !== "none";
          setHasSubscription(isActive && isPaid);
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

  // Redirect to pricing page if no subscription
  useEffect(() => {
    if (!loading && !hasSubscription) {
      router.push("/");
    }
  }, [loading, hasSubscription, router]);

  // Show loading spinner
  if (loading || !hasSubscription) {
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
          <p style={{ color: "#64748b", margin: 0 }}>
            {loading ? "Checking subscription..." : "Redirecting to plans..."}
          </p>
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

  return <>{children}</>;
}

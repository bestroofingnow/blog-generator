// components/SubscriptionGuard.tsx
// Component to protect routes that require an active subscription

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

// Super admin emails that always have access
const SUPER_ADMIN_EMAILS = ["james@bestroofingnow.com"];

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Check subscription status
  useEffect(() => {
    // Wait for session to be loaded
    if (sessionStatus === "loading") {
      return;
    }

    // Quick check: If user email is super admin, grant immediate access
    const userEmail = session?.user?.email?.toLowerCase();
    if (userEmail && SUPER_ADMIN_EMAILS.includes(userEmail)) {
      console.log("[SubscriptionGuard] Super admin detected from email:", userEmail);
      setHasSubscription(true);
      setLoading(false);
      return;
    }

    // Also check: If user has superadmin role in session, grant immediate access
    const userRole = (session?.user as { role?: string })?.role;
    if (userRole === "superadmin") {
      console.log("[SubscriptionGuard] Super admin detected from session role");
      setHasSubscription(true);
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const res = await fetch("/api/billing/credits");
        const data = await res.json();

        console.log("[SubscriptionGuard] Credits API response:", JSON.stringify(data));

        if (data.success && data.data?.subscription) {
          const sub = data.data.subscription;
          // Super admins always have access
          if (sub.tier === "superadmin") {
            console.log("[SubscriptionGuard] Super admin tier detected");
            setHasSubscription(true);
            return;
          }
          // Check if user has an active paid subscription
          const isActive = sub.status === "active" || sub.status === "trialing";
          const isPaid = sub.tier !== "free" && sub.tier !== "none";
          console.log("[SubscriptionGuard] Subscription check:", { tier: sub.tier, status: sub.status, isActive, isPaid });
          setHasSubscription(isActive && isPaid);
        } else {
          console.log("[SubscriptionGuard] No valid subscription data:", data);
          setHasSubscription(false);
        }
      } catch (error) {
        console.error("[SubscriptionGuard] Failed to check subscription:", error);
        setHasSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [session, sessionStatus]);

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

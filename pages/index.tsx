// pages/index.tsx
// Root page - redirects to /app if subscribed, otherwise shows pricing

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import PricingPage from "./pricing";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import { isSuperAdminEmail } from "../lib/super-admin";

export default function IndexPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      if (status === "unauthenticated") {
        setCheckingSubscription(false);
        return;
      }

      if (status === "authenticated") {
        try {
          const res = await fetch("/api/billing/credits");
          const data = await res.json();
          if (data.success && data.data) {
            const tier = data.data.subscription?.tier;
            const subStatus = data.data.subscription?.status;
            // Super admins or active paid subscribers go to app
            const isSuperAdmin = tier === "superadmin";
            const isActiveSubscriber = tier && tier !== "free" && subStatus === "active";
            if (isSuperAdmin || isActiveSubscriber) {
              setHasActiveSubscription(true);
              router.replace("/app");
              return;
            }
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
        setCheckingSubscription(false);
      }
    }

    if (status !== "loading") {
      checkSubscription();
    }
  }, [status, router]);

  // Show loading while checking
  if (status === "loading" || checkingSubscription) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Head>
          <title>Kynex AI - AI-Powered SEO Content Generator</title>
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

  // If redirecting to app, show loading
  if (hasActiveSubscription) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}>
        <Head>
          <title>Redirecting... | Kynex AI</title>
        </Head>
        <div style={{
          width: 48,
          height: 48,
          border: "3px solid rgba(255,255,255,0.2)",
          borderTopColor: "#8b5cf6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
        <p style={{ color: "rgba(255,255,255,0.6)" }}>Redirecting to app...</p>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Show pricing page for non-subscribers
  return <PricingPage />;
}

// Server-side redirect for super admins - they should go directly to the app
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  // If user is logged in and is a super admin, redirect to app
  if (session?.user?.email && isSuperAdminEmail(session.user.email)) {
    return {
      redirect: {
        destination: "/app",
        permanent: false,
      },
    };
  }

  return { props: {} };
};

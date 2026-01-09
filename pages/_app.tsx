// pages/_app.tsx
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { SessionProvider, useSession } from "next-auth/react";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme-context";
import { ChatProvider } from "../lib/chat-context";
import AuthGuard from "../components/AuthGuard";
import SubscriptionGuard from "../components/SubscriptionGuard";
import OnboardingTrigger from "../components/onboarding/OnboardingTrigger";
import CommandPalette from "../components/CommandPalette";
import "../styles/globals.css";

// Super admin emails that bypass subscription checks entirely
const SUPER_ADMIN_EMAILS = ["james@bestroofingnow.com"];

// Pages that don't require authentication (prefix match)
const publicPages = ["/login", "/api/auth"];
// Public pages that need exact match (pricing/landing pages)
const publicPagesExact = ["/", "/pricing"];

// Pages that require auth but NOT a subscription (so users can subscribe)
const noSubscriptionRequired = ["/settings/billing", "/settings/team", "/invite"];

// Inner component that can use useSession
function AppContent({ Component, pageProps, router }: { Component: AppProps["Component"]; pageProps: Record<string, unknown>; router: ReturnType<typeof useRouter> }) {
  const { data: session } = useSession();

  const isPublicPage =
    publicPagesExact.includes(router.pathname) ||
    publicPages.some((page) => router.pathname.startsWith(page));
  const skipSubscriptionCheck = noSubscriptionRequired.some((page) => router.pathname.startsWith(page));

  // Super admins bypass subscription check entirely
  const userEmail = session?.user?.email?.toLowerCase();
  const isSuperAdmin = userEmail && SUPER_ADMIN_EMAILS.includes(userEmail);

  if (isPublicPage) {
    return <Component {...pageProps} />;
  }

  return (
    <AuthGuard>
      {skipSubscriptionCheck || isSuperAdmin ? (
        <ChatProvider>
          <CommandPalette />
          <Component {...pageProps} />
        </ChatProvider>
      ) : (
        <SubscriptionGuard>
          <ChatProvider>
            <OnboardingTrigger />
            <CommandPalette />
            <Component {...pageProps} />
          </ChatProvider>
        </SubscriptionGuard>
      )}
    </AuthGuard>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  return (
    <ThemeProvider>
      <SessionProvider session={session}>
        <AuthProvider>
          <AppContent Component={Component} pageProps={pageProps} router={router} />
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

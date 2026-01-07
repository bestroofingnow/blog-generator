// pages/_app.tsx
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme-context";
import { ChatProvider } from "../lib/chat-context";
import AuthGuard from "../components/AuthGuard";
import SubscriptionGuard from "../components/SubscriptionGuard";
import OnboardingTrigger from "../components/onboarding/OnboardingTrigger";
import CommandPalette from "../components/CommandPalette";
import "../styles/globals.css";

// Pages that don't require authentication
const publicPages = ["/login", "/api/auth"];

// Pages that require auth but NOT a subscription (so users can subscribe)
const noSubscriptionRequired = ["/settings/billing", "/settings/team"];

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const isPublicPage = publicPages.some((page) => router.pathname.startsWith(page));
  const skipSubscriptionCheck = noSubscriptionRequired.some((page) => router.pathname.startsWith(page));

  return (
    <ThemeProvider>
      <SessionProvider session={session}>
        <AuthProvider>
          {isPublicPage ? (
            <Component {...pageProps} />
          ) : (
            <AuthGuard>
              {skipSubscriptionCheck ? (
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
          )}
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

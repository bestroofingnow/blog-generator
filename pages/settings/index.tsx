// pages/settings/index.tsx
// Main settings hub page

import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

const settingsLinks = [
  {
    title: "Billing & Credits",
    description: "Manage your subscription and credit balance",
    href: "/settings/billing",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    title: "Team Management",
    description: "Invite members and manage team access",
    href: "/settings/team",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    title: "WordPress Integration",
    description: "Connect your WordPress site for publishing",
    href: "/settings/wordpress",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
  },
  {
    title: "API Keys",
    description: "Manage your AI service API keys",
    href: "/settings/api-keys",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Settings | Blog Generator</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-500 text-sm mb-2 inline-block"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account, billing, and integrations
          </p>
        </div>

        {/* User Info */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl text-indigo-600 font-medium">
                {(session?.user?.name || session?.user?.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {session?.user?.name || "User"}
              </h2>
              <p className="text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Settings Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-lg shadow-sm border p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {link.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Admin Link - Only show for superadmins */}
        {session?.user?.role === "superadmin" && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Administration
            </h3>
            <Link
              href="/admin"
              className="bg-purple-50 rounded-lg border border-purple-200 p-6 hover:border-purple-400 hover:shadow-md transition-all block"
            >
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900">
                    Admin Dashboard
                  </h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Manage organizations, view revenue, and audit logs
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

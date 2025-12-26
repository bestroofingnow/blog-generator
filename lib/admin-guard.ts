// lib/admin-guard.ts
// Middleware and utilities for admin-only access

import { getServerSession } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { UserRole } from "./db";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
}

// Check if user is admin from session (includes superadmin)
export function isAdmin(session: { user?: SessionUser } | null): boolean {
  return session?.user?.role === "admin" || session?.user?.role === "superadmin";
}

// Check if user is superadmin from session
export function isSuperAdmin(session: { user?: SessionUser } | null): boolean {
  return session?.user?.role === "superadmin";
}

// Check if user has specific role
export function hasRole(
  session: { user?: SessionUser } | null,
  role: UserRole
): boolean {
  return session?.user?.role === role;
}

// API route guard - returns 403 if not admin (superadmin also passes)
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ authorized: boolean; session: { user: SessionUser } | null }> {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized - Not logged in" });
    return { authorized: false, session: null };
  }

  if (session.user.role !== "admin" && session.user.role !== "superadmin") {
    res.status(403).json({ error: "Forbidden - Admin access required" });
    return { authorized: false, session: null };
  }

  return { authorized: true, session: session as { user: SessionUser } };
}

// API route guard - returns 401 if not authenticated
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ authorized: boolean; session: { user: SessionUser } | null }> {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized - Not logged in" });
    return { authorized: false, session: null };
  }

  return { authorized: true, session: session as { user: SessionUser } };
}

// Higher-order function for API route protection
export function withAdmin(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    session: { user: SessionUser }
  ) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { authorized, session } = await requireAdmin(req, res);
    if (!authorized || !session) return;
    return handler(req, res, session);
  };
}

// Higher-order function for authenticated API routes
export function withAuth(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    session: { user: SessionUser }
  ) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { authorized, session } = await requireAuth(req, res);
    if (!authorized || !session) return;
    return handler(req, res, session);
  };
}

// SSR guard for admin pages
export async function getServerSidePropsWithAdmin<P extends { [key: string]: unknown }>(
  context: GetServerSidePropsContext,
  getProps?: (session: { user: SessionUser }) => Promise<P>
): Promise<GetServerSidePropsResult<P & { session: { user: SessionUser } }>> {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions
  );

  // Not logged in - redirect to login
  if (!session?.user) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  // Not admin or superadmin - redirect to home with error
  if (session.user.role !== "admin" && session.user.role !== "superadmin") {
    return {
      redirect: {
        destination: "/?error=admin_required",
        permanent: false,
      },
    };
  }

  // Get additional props if provided
  const additionalProps = getProps
    ? await getProps(session as { user: SessionUser })
    : ({} as P);

  return {
    props: {
      ...additionalProps,
      session: session as { user: SessionUser },
    },
  };
}

// SSR guard for authenticated pages
export async function getServerSidePropsWithAuth<P extends { [key: string]: unknown }>(
  context: GetServerSidePropsContext,
  getProps?: (session: { user: SessionUser }) => Promise<P>
): Promise<GetServerSidePropsResult<P & { session: { user: SessionUser } }>> {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions
  );

  if (!session?.user) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  const additionalProps = getProps
    ? await getProps(session as { user: SessionUser })
    : ({} as P);

  return {
    props: {
      ...additionalProps,
      session: session as { user: SessionUser },
    },
  };
}

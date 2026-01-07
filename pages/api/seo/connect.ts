// pages/api/seo/connect.ts
// Initiates OAuth flow for Google Search Console connection

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

// Scopes needed for SEO features
const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly", // Search Console read
  "https://www.googleapis.com/auth/indexing", // URL indexing
  "https://www.googleapis.com/auth/userinfo.email", // Get user's email
].join(" ");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/seo/callback`;

  if (!clientId) {
    return res.status(500).json({ error: "Google OAuth not configured" });
  }

  // Store user ID in state for callback
  const state = Buffer.from(JSON.stringify({
    userId: session.user.id,
    returnUrl: req.query.returnUrl || "/settings",
  })).toString("base64");

  // Build OAuth URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline"); // Get refresh token
  authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh token
  authUrl.searchParams.set("state", state);

  // Redirect to Google
  res.redirect(authUrl.toString());
}

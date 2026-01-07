// pages/api/seo/ads-connect.ts
// Initiates OAuth flow for Search Ads 360 connection

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

// Scopes needed for Search Ads 360
// See: https://developers.google.com/search-ads/v2/authorization
const SCOPES = [
  "https://www.googleapis.com/auth/doubleclicksearch", // Search Ads 360 access
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
  const baseUrl = process.env.NEXTAUTH_URL?.trim();
  const redirectUri = `${baseUrl}/api/seo/ads-callback`;

  console.log("[Ads Connect] Initiating OAuth flow");
  console.log("[Ads Connect] Redirect URI:", redirectUri);

  if (!clientId) {
    return res.status(500).json({ error: "Google OAuth not configured" });
  }

  if (!baseUrl) {
    return res.status(500).json({ error: "NEXTAUTH_URL not configured" });
  }

  // Store user ID in state for callback
  const state = Buffer.from(JSON.stringify({
    userId: session.user.id,
    returnUrl: req.query.returnUrl || "/seo-tools",
    connectionType: "ads", // Differentiate from search console
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

  console.log("[Ads Connect] Redirecting to Google OAuth...");

  // Redirect to Google
  res.redirect(authUrl.toString());
}

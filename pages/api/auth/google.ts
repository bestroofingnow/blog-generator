// pages/api/auth/google.ts
// Initiates Google OAuth flow for Search Console access

import { NextApiRequest, NextApiResponse } from "next";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

// Scopes needed for Search Console
const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly", // Search Console read access
  "https://www.googleapis.com/auth/userinfo.email", // Get user email
].join(" ");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID in environment variables." });
  }

  // Build OAuth URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline"); // Get refresh token
  authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh token

  res.redirect(authUrl.toString());
}

// pages/api/auth/google/callback.ts
// Handles OAuth callback and exchanges code for tokens

import { NextApiRequest, NextApiResponse } from "next";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, error } = req.query;

  if (error) {
    // User denied access or other error
    return res.redirect(`/?gsc_error=${encodeURIComponent(error as string)}`);
  }

  if (!code || typeof code !== "string") {
    return res.redirect("/?gsc_error=no_code");
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect("/?gsc_error=not_configured");
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return res.redirect("/?gsc_error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();

    // Get user info to display email
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    let userEmail = "";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      userEmail = userInfo.email || "";
    }

    // Redirect back to app with tokens in URL fragment (client-side only)
    // In production, you'd want to use secure HTTP-only cookies or a session
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      email: userEmail,
      connected_at: new Date().toISOString(),
    };

    // Encode tokens as base64 for URL safety
    const encodedTokens = Buffer.from(JSON.stringify(tokenData)).toString("base64");

    res.redirect(`/?gsc_connected=true&gsc_data=${encodedTokens}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return res.redirect("/?gsc_error=callback_failed");
  }
}

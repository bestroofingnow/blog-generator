// pages/api/seo/callback.ts
// Handles OAuth callback from Google, exchanges code for tokens

import type { NextApiRequest, NextApiResponse } from "next";
import { db, googleConnections, eq } from "../../../lib/db";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface UserInfo {
  email: string;
  name?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, state, error } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error("[SEO Callback] OAuth error:", error);
    return res.redirect(`/settings?error=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect("/settings?error=missing_params");
  }

  // Decode state
  let stateData: { userId: string; returnUrl: string };
  try {
    stateData = JSON.parse(Buffer.from(String(state), "base64").toString());
  } catch {
    return res.redirect("/settings?error=invalid_state");
  }

  const { userId, returnUrl } = stateData;

  if (!userId) {
    return res.redirect("/settings?error=no_user");
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.NEXTAUTH_URL?.trim();
    const redirectUri = `${baseUrl}/api/seo/callback`;

    console.log("[SEO Callback] Processing OAuth callback");
    console.log("[SEO Callback] Redirect URI for token exchange:", redirectUri);

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[SEO Callback] Token exchange failed:", errorData);
      return res.redirect(`${returnUrl}?error=token_exchange_failed`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get user's email
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    let googleEmail = "";
    if (userInfoResponse.ok) {
      const userInfo: UserInfo = await userInfoResponse.json();
      googleEmail = userInfo.email;
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if user already has a connection
    const existingConnection = await db
      .select()
      .from(googleConnections)
      .where(eq(googleConnections.userId, userId))
      .limit(1);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(googleConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingConnection[0].refreshToken,
          expiresAt,
          tokenType: tokens.token_type,
          scope: tokens.scope,
          googleEmail,
          connectedAt: new Date(),
          lastRefreshedAt: new Date(),
          isActive: true,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(googleConnections.userId, userId));
    } else {
      // Create new connection
      await db.insert(googleConnections).values({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        googleEmail,
        connectedAt: new Date(),
        lastRefreshedAt: new Date(),
        isActive: true,
      });
    }

    console.log(`[SEO Callback] Successfully connected Google for user ${userId}`);

    // Redirect back to settings with success
    res.redirect(`${returnUrl}?google_connected=true`);
  } catch (error) {
    console.error("[SEO Callback] Error:", error);
    res.redirect(`${returnUrl}?error=connection_failed`);
  }
}

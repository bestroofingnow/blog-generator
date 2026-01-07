// pages/api/seo/ads-callback.ts
// Handles OAuth callback from Google for Search Ads 360

import type { NextApiRequest, NextApiResponse } from "next";
import { db, adsConnections, eq } from "../../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, state, error } = req.query;
  let returnUrl = "/seo-tools";

  // Parse state to get user info
  let userId: string | null = null;
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(state as string, "base64").toString());
      userId = decoded.userId;
      returnUrl = decoded.returnUrl || "/seo-tools";
    }
  } catch (e) {
    console.error("[Ads Callback] Failed to parse state:", e);
  }

  // Handle OAuth errors
  if (error) {
    console.error("[Ads Callback] OAuth error:", error);
    return res.redirect(`${returnUrl}?ads_error=${encodeURIComponent(error as string)}`);
  }

  if (!code) {
    return res.redirect(`${returnUrl}?ads_error=no_code`);
  }

  if (!userId) {
    return res.redirect(`${returnUrl}?ads_error=no_user`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.NEXTAUTH_URL?.trim();
    const redirectUri = `${baseUrl}/api/seo/ads-callback`;

    console.log("[Ads Callback] Processing OAuth callback for user:", userId);

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[Ads Callback] Token exchange failed:", errorText);
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();
    console.log("[Ads Callback] Got tokens, expires_in:", tokens.expires_in);

    // Get user's email from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    let connectedEmail = "";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      connectedEmail = userInfo.email || "";
      console.log("[Ads Callback] Connected as:", connectedEmail);
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if user already has an ads connection
    const existingConnection = await db
      .select()
      .from(adsConnections)
      .where(eq(adsConnections.userId, userId))
      .limit(1);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(adsConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingConnection[0].refreshToken,
          expiresAt,
          connectedEmail,
          isActive: true,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(adsConnections.userId, userId));
      console.log("[Ads Callback] Updated existing connection");
    } else {
      // Create new connection
      await db.insert(adsConnections).values({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        connectedEmail,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("[Ads Callback] Created new connection");
    }

    console.log(`[Ads Callback] Successfully connected Search Ads 360 for user ${userId}`);

    // Redirect back with success
    res.redirect(`${returnUrl}?ads_connected=true`);
  } catch (error) {
    console.error("[Ads Callback] Error:", error);
    res.redirect(`${returnUrl}?ads_error=connection_failed`);
  }
}

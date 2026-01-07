// pages/api/seo/connection.ts
// Manage Google Search Console connection - GET status, DELETE to disconnect

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, googleConnections, eq } from "../../../lib/db";

interface ConnectionStatus {
  connected: boolean;
  googleEmail?: string;
  connectedSiteUrl?: string;
  connectedAt?: string;
  scopes?: string[];
  isActive?: boolean;
  errorMessage?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.user.id;

  if (req.method === "GET") {
    // Get connection status
    try {
      const connection = await db
        .select()
        .from(googleConnections)
        .where(eq(googleConnections.userId, userId))
        .limit(1);

      if (connection.length === 0) {
        return res.status(200).json({
          connected: false,
        } as ConnectionStatus);
      }

      const conn = connection[0];
      return res.status(200).json({
        connected: true,
        googleEmail: conn.googleEmail,
        connectedSiteUrl: conn.connectedSiteUrl,
        connectedAt: conn.connectedAt?.toISOString(),
        scopes: conn.scope?.split(" "),
        isActive: conn.isActive,
        errorMessage: conn.errorMessage,
      } as ConnectionStatus);
    } catch (error) {
      console.error("[Connection Status] Error:", error);
      return res.status(500).json({ error: "Failed to get connection status" });
    }
  } else if (req.method === "DELETE") {
    // Disconnect Google
    try {
      await db
        .delete(googleConnections)
        .where(eq(googleConnections.userId, userId));

      console.log(`[Connection] Disconnected Google for user ${userId}`);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Connection Delete] Error:", error);
      return res.status(500).json({ error: "Failed to disconnect" });
    }
  } else if (req.method === "PATCH") {
    // Update connected site URL
    try {
      const { siteUrl } = req.body;

      if (!siteUrl) {
        return res.status(400).json({ error: "siteUrl is required" });
      }

      await db
        .update(googleConnections)
        .set({
          connectedSiteUrl: siteUrl,
          updatedAt: new Date(),
        })
        .where(eq(googleConnections.userId, userId));

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Connection Update] Error:", error);
      return res.status(500).json({ error: "Failed to update connection" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

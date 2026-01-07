// pages/api/seo/ads-connection.ts
// Check user's Search Ads 360 connection status

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getUserAdsConnectionDetails } from "../../../lib/google-apis";

interface ConnectionResponse {
  connected: boolean;
  connectedEmail?: string;
  advertiserId?: string;
  advertiserName?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ connected: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ connected: false, error: "Unauthorized" });
  }

  try {
    const details = await getUserAdsConnectionDetails(session.user.id);

    return res.status(200).json({
      connected: details.connected ?? false,
      connectedEmail: details.connectedEmail ?? undefined,
      advertiserId: details.advertiserId ?? undefined,
      advertiserName: details.advertiserName ?? undefined,
      error: details.error ?? undefined,
    });
  } catch (error) {
    console.error("[Ads Connection] Error:", error);
    return res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : "Failed to check connection",
    });
  }
}

// pages/api/automation/settings.ts
// GET/PUT automation settings for a user

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getAutomationSettings, saveAutomationSettings } from "../../../lib/database";
import type { AutomationSettings } from "../../../lib/db";

interface SettingsResponse {
  success: boolean;
  settings?: AutomationSettings;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SettingsResponse>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  if (req.method === "GET") {
    try {
      const settings = await getAutomationSettings(userId);
      if (!settings) {
        return res.status(500).json({ success: false, error: "Failed to load settings" });
      }
      return res.status(200).json({ success: true, settings });
    } catch (error) {
      console.error("Error getting automation settings:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load settings",
      });
    }
  }

  if (req.method === "PUT") {
    const {
      allowBuildEntireSite,
      allowAutoCreateDailyBlogs,
      allowAutoScheduleBlogs,
      allowAutoPostBlogs,
      dailyBlogFrequency,
      autoPostPlatform,
      autoCreateMode,
    } = req.body;

    // Validate dailyBlogFrequency
    if (dailyBlogFrequency !== undefined && (typeof dailyBlogFrequency !== "number" || dailyBlogFrequency < 1 || dailyBlogFrequency > 5)) {
      return res.status(400).json({
        success: false,
        error: "Daily blog frequency must be between 1 and 5",
      });
    }

    // Validate autoPostPlatform
    if (autoPostPlatform !== undefined && !["wordpress", "ghl"].includes(autoPostPlatform)) {
      return res.status(400).json({
        success: false,
        error: "Auto post platform must be 'wordpress' or 'ghl'",
      });
    }

    // Validate autoCreateMode
    if (autoCreateMode !== undefined && !["automatic", "queue_for_review"].includes(autoCreateMode)) {
      return res.status(400).json({
        success: false,
        error: "Auto create mode must be 'automatic' or 'queue_for_review'",
      });
    }

    try {
      const result = await saveAutomationSettings(userId, {
        allowBuildEntireSite,
        allowAutoCreateDailyBlogs,
        allowAutoScheduleBlogs,
        allowAutoPostBlogs,
        dailyBlogFrequency,
        autoPostPlatform,
        autoCreateMode,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error?.message || "Failed to save settings",
        });
      }

      // Fetch updated settings to return
      const settings = await getAutomationSettings(userId);
      return res.status(200).json({ success: true, settings: settings || undefined });
    } catch (error) {
      console.error("Error saving automation settings:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to save settings",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

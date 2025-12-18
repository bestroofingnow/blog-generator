// pages/api/schedule/update.ts
// API endpoint to update a blog's scheduled publish date

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { updateBlogSchedule, getBlogSchedule } from "../../../lib/database";

interface UpdateScheduleResponse {
  success: boolean;
  blog?: {
    id: string;
    scheduledPublishAt: string | null;
    scheduleStatus: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateScheduleResponse>
) {
  if (req.method !== "PATCH" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  const { blogId, scheduledPublishAt } = req.body;

  if (!blogId) {
    return res.status(400).json({ success: false, error: "blogId is required" });
  }

  try {
    // Parse the date if provided
    const scheduleDate = scheduledPublishAt ? new Date(scheduledPublishAt) : null;

    // Validate the date if provided
    if (scheduleDate && isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid date format" });
    }

    // Update the schedule
    const { error } = await updateBlogSchedule(
      userId,
      blogId,
      scheduleDate
    );

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Fetch the updated blog to return
    const updatedBlog = await getBlogSchedule(userId, blogId);

    if (!updatedBlog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }

    return res.status(200).json({
      success: true,
      blog: {
        id: updatedBlog.id,
        scheduledPublishAt: updatedBlog.scheduledPublishAt?.toISOString() || null,
        scheduleStatus: updatedBlog.scheduleStatus,
      },
    });
  } catch (error) {
    console.error("Schedule update error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update schedule",
    });
  }
}

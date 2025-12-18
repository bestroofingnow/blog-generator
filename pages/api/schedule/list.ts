// pages/api/schedule/list.ts
// API endpoint to list scheduled and unscheduled blogs for the calendar view

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { loadScheduledBlogs, loadUnscheduledBlogs } from "../../../lib/database";
import type { ScheduledBlog } from "../../../lib/db";

interface ListScheduleResponse {
  success: boolean;
  data?: {
    scheduled: Array<{
      id: string;
      title: string;
      type: string;
      scheduledPublishAt: string | null;
      scheduleStatus: string;
      featuredImageUrl?: string;
    }>;
    unscheduled: Array<{
      id: string;
      title: string;
      type: string;
      scheduleStatus: string;
      featuredImageUrl?: string;
    }>;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListScheduleResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const { year, month, status } = req.query;

    // Parse year and month if provided
    const yearNum = year ? parseInt(year as string) : undefined;
    const monthNum = month ? parseInt(month as string) : undefined;

    // Fetch scheduled blogs
    const scheduledBlogs = await loadScheduledBlogs(
      userId,
      yearNum,
      monthNum
    );

    // Fetch unscheduled blogs (unless only requesting scheduled)
    let unscheduledBlogs: ScheduledBlog[] = [];
    if (status !== "scheduled") {
      unscheduledBlogs = await loadUnscheduledBlogs(userId);
    }

    // Transform to response format
    const scheduled = scheduledBlogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      type: blog.type,
      scheduledPublishAt: blog.scheduledPublishAt?.toISOString() || null,
      scheduleStatus: blog.scheduleStatus,
      featuredImageUrl: blog.featuredImageUrl,
    }));

    const unscheduled = unscheduledBlogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      type: blog.type,
      scheduleStatus: blog.scheduleStatus,
      featuredImageUrl: blog.featuredImageUrl,
    }));

    return res.status(200).json({
      success: true,
      data: {
        scheduled,
        unscheduled,
      },
    });
  } catch (error) {
    console.error("Schedule list error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to load schedule",
    });
  }
}

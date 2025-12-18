// pages/api/site-builder/proposal/[id].ts
// GET/PUT/POST for managing a specific site structure proposal

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import {
  getSiteProposal,
  updateSiteProposal,
  addToQueue,
  getDailyUsage,
} from "../../../../lib/database";
import type { ProposalStatus, ProposedSiteStructure } from "../../../../lib/db";

interface ProposalResponse {
  success: boolean;
  proposal?: {
    id: string;
    status: string;
    industry: string | null;
    proposedStructure: ProposedSiteStructure | null;
    aiReasoning: string | null;
    userModifications: Record<string, unknown> | null;
    generationProgress: {
      total: number;
      completed: number;
      current: string;
    } | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  error?: string;
  estimatedTime?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProposalResponse>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Proposal ID is required" });
  }

  // GET - Retrieve proposal
  if (req.method === "GET") {
    try {
      const proposal = await getSiteProposal(userId, id);

      if (!proposal) {
        return res.status(404).json({ success: false, error: "Proposal not found" });
      }

      return res.status(200).json({
        success: true,
        proposal: {
          id: proposal.id,
          status: proposal.status || "draft",
          industry: proposal.industry,
          proposedStructure: proposal.proposedStructure as ProposedSiteStructure | null,
          aiReasoning: proposal.aiReasoning,
          userModifications: proposal.userModifications as Record<string, unknown> | null,
          generationProgress: proposal.generationProgress as {
            total: number;
            completed: number;
            current: string;
          } | null,
          createdAt: proposal.createdAt,
          updatedAt: proposal.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error getting proposal:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get proposal",
      });
    }
  }

  // PUT - Update proposal (user modifications)
  if (req.method === "PUT") {
    const { userModifications } = req.body;

    try {
      const result = await updateSiteProposal(userId, id, {
        userModifications,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error?.message || "Failed to update proposal",
        });
      }

      // Fetch updated proposal
      const proposal = await getSiteProposal(userId, id);

      return res.status(200).json({
        success: true,
        proposal: proposal
          ? {
              id: proposal.id,
              status: proposal.status || "draft",
              industry: proposal.industry,
              proposedStructure: proposal.proposedStructure as ProposedSiteStructure | null,
              aiReasoning: proposal.aiReasoning,
              userModifications: proposal.userModifications as Record<string, unknown> | null,
              generationProgress: proposal.generationProgress as {
                total: number;
                completed: number;
                current: string;
              } | null,
              createdAt: proposal.createdAt,
              updatedAt: proposal.updatedAt,
            }
          : undefined,
      });
    } catch (error) {
      console.error("Error updating proposal:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update proposal",
      });
    }
  }

  // POST - Approve and start generation
  if (req.method === "POST") {
    const { action } = req.body;

    if (action !== "approve") {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Use 'approve' to start generation.",
      });
    }

    try {
      // Get the proposal
      const proposal = await getSiteProposal(userId, id);

      if (!proposal) {
        return res.status(404).json({ success: false, error: "Proposal not found" });
      }

      if (proposal.status === "generating" || proposal.status === "completed") {
        return res.status(400).json({
          success: false,
          error: `Proposal is already ${proposal.status}`,
        });
      }

      const structure = proposal.proposedStructure as ProposedSiteStructure | null;
      if (!structure) {
        return res.status(400).json({
          success: false,
          error: "Proposal has no structure to generate",
        });
      }

      // Check daily usage limit
      const usage = await getDailyUsage(userId);

      // Calculate total pages to generate
      const totalPages =
        structure.servicePages.length +
        structure.locationPages.length +
        structure.blogTopics.length;

      if (totalPages > usage.remaining) {
        return res.status(429).json({
          success: false,
          error: `Generation requires ${totalPages} pages but you only have ${usage.remaining} remaining today`,
        });
      }

      // Apply user modifications if any
      const modifications = proposal.userModifications as {
        removedPages?: string[];
        addedPages?: Array<{ type: string; title: string }>;
      } | null;

      let finalServicePages = structure.servicePages;
      let finalLocationPages = structure.locationPages;
      let finalBlogTopics = structure.blogTopics;

      if (modifications?.removedPages) {
        finalServicePages = finalServicePages.filter(
          (p) => !modifications.removedPages?.includes(p.slug)
        );
        finalLocationPages = finalLocationPages.filter(
          (p) => !modifications.removedPages?.includes(p.slug)
        );
        finalBlogTopics = finalBlogTopics.filter(
          (t) => !modifications.removedPages?.includes(t.title)
        );
      }

      // Create queue items for all pages
      const queueItems: Array<{
        type: "blog" | "service_page" | "location_page";
        topic: string;
        keywords?: string;
        priority: number;
      }> = [];

      // Add service pages to queue
      finalServicePages.forEach((page, index) => {
        queueItems.push({
          type: "service_page",
          topic: page.title,
          keywords: page.slug,
          priority: 100 - index, // Higher priority for service pages
        });
      });

      // Add location pages to queue
      finalLocationPages.forEach((page, index) => {
        queueItems.push({
          type: "location_page",
          topic: `${page.service} in ${page.city}`,
          keywords: page.slug,
          priority: 50 - index, // Medium priority for location pages
        });
      });

      // Add blog posts to queue
      finalBlogTopics.forEach((blogTopic, index) => {
        queueItems.push({
          type: "blog",
          topic: blogTopic.title,
          keywords: blogTopic.keywords?.join(", "),
          priority: blogTopic.priority ?? index, // Use provided priority or index
        });
      });

      // Add all items to generation queue
      const queueResult = await addToQueue(userId, queueItems);

      if (!queueResult.success) {
        return res.status(500).json({
          success: false,
          error: "Failed to add pages to generation queue",
        });
      }

      // Update proposal status to generating
      await updateSiteProposal(userId, id, {
        status: "generating" as ProposalStatus,
        generationProgress: {
          total: queueItems.length,
          completed: 0,
          current: queueItems[0]?.topic || "",
        },
      });

      // Estimate time (roughly 2 minutes per page)
      const estimatedMinutes = queueItems.length * 2;
      const estimatedTime =
        estimatedMinutes > 60
          ? `${Math.ceil(estimatedMinutes / 60)} hours`
          : `${estimatedMinutes} minutes`;

      return res.status(200).json({
        success: true,
        proposal: {
          id,
          status: "generating",
          industry: proposal.industry,
          proposedStructure: structure,
          aiReasoning: proposal.aiReasoning,
          userModifications: modifications,
          generationProgress: {
            total: queueItems.length,
            completed: 0,
            current: queueItems[0]?.topic || "",
          },
          createdAt: proposal.createdAt,
          updatedAt: new Date(),
        },
        estimatedTime,
      });
    } catch (error) {
      console.error("Error approving proposal:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to approve proposal",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

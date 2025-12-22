// pages/api/workflow/[id]/status.ts
// Get or update workflow status

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getWorkflowRun, updateWorkflowRun, getWorkflowTasks } from "../../../../lib/database";
import { getWorkflowHealth, pauseWorkflow, resumeWorkflow, cancelWorkflow } from "../../../../lib/workflow/recovery";
import type { WorkflowRun, WorkflowTask, WorkflowStatus } from "../../../../lib/db";
import { STAGE_METADATA, STAGE_ORDER } from "../../../../lib/workflow/types";

interface StatusResponse {
  success: boolean;
  workflow?: WorkflowRun;
  tasks?: WorkflowTask[];
  health?: {
    status: "healthy" | "warning" | "critical";
    issues: string[];
    staleTasks: number;
    failedTasks: number;
    blockedTasks: number;
  };
  progress?: {
    currentStage: string;
    currentStageLabel: string;
    stagesComplete: number;
    totalStages: number;
    overallPercent: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { id } = req.query;
  const workflowId = Array.isArray(id) ? id[0] : id;

  if (!workflowId) {
    return res.status(400).json({ success: false, error: "Workflow ID required" });
  }

  if (req.method === "GET") {
    return handleGet(userId, workflowId, res);
  } else if (req.method === "POST") {
    return handlePost(userId, workflowId, req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGet(
  userId: string,
  workflowId: string,
  res: NextApiResponse<StatusResponse>
) {
  try {
    const workflow = await getWorkflowRun(userId, workflowId);

    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }

    const tasks = await getWorkflowTasks(workflowId);
    const health = await getWorkflowHealth(workflowId);

    // Calculate progress
    const currentStage = workflow.currentStage || "intake";
    const stageIndex = STAGE_ORDER.indexOf(currentStage as typeof STAGE_ORDER[number]);
    const stagesComplete = stageIndex >= 0 ? stageIndex : 0;
    const totalStages = STAGE_ORDER.length;
    const stageMetadata = STAGE_METADATA[currentStage as keyof typeof STAGE_METADATA];

    const progress = {
      currentStage,
      currentStageLabel: stageMetadata?.label || currentStage,
      stagesComplete,
      totalStages,
      overallPercent: Math.round((stagesComplete / totalStages) * 100),
    };

    return res.status(200).json({
      success: true,
      workflow,
      tasks,
      health,
      progress,
    });
  } catch (error) {
    console.error("[Workflow Status] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get status",
    });
  }
}

async function handlePost(
  userId: string,
  workflowId: string,
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  const { action, reason } = req.body as { action: "pause" | "resume" | "cancel"; reason?: string };

  if (!action) {
    return res.status(400).json({ success: false, error: "Action required" });
  }

  try {
    switch (action) {
      case "pause":
        await pauseWorkflow(workflowId, reason || "User requested pause");
        break;
      case "resume":
        await resumeWorkflow(workflowId);
        break;
      case "cancel":
        await cancelWorkflow(workflowId, reason || "User cancelled");
        break;
      default:
        return res.status(400).json({ success: false, error: "Invalid action" });
    }

    const workflow = await getWorkflowRun(userId, workflowId);
    return res.status(200).json({ success: true, workflow: workflow || undefined });
  } catch (error) {
    console.error("[Workflow Status] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    });
  }
}

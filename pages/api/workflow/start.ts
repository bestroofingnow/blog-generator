// pages/api/workflow/start.ts
// Start a new workflow run

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { createWorkflowRun, startWorkflowRun, createSiteProposal, updateProposalWorkflowData } from "../../../lib/database";
import { createTask } from "../../../lib/workflow/state-machine";
import type { WorkflowType, IntakeData } from "../../../lib/db";

interface StartWorkflowRequest {
  workflowType: WorkflowType;
  proposalId?: string;
  intakeData?: IntakeData;
}

interface StartWorkflowResponse {
  success: boolean;
  workflowId?: string;
  proposalId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StartWorkflowResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { workflowType, proposalId, intakeData } = req.body as StartWorkflowRequest;

  if (!workflowType) {
    return res.status(400).json({ success: false, error: "workflowType is required" });
  }

  try {
    let finalProposalId = proposalId;

    // If no proposal exists for site_build, create one
    if (workflowType === "site_build" && !proposalId) {
      const proposalResult = await createSiteProposal(userId, {
        industry: intakeData?.industry,
        status: "draft",
      });

      if (!proposalResult.success || !proposalResult.proposalId) {
        return res.status(500).json({
          success: false,
          error: "Failed to create site proposal",
        });
      }

      finalProposalId = proposalResult.proposalId;
    }

    // Create the workflow run
    const workflowResult = await createWorkflowRun(userId, {
      proposalId: finalProposalId,
      workflowType,
      initialStage: "intake",
    });

    if (!workflowResult.success || !workflowResult.workflowId) {
      return res.status(500).json({
        success: false,
        error: "Failed to create workflow",
      });
    }

    const workflowId = workflowResult.workflowId;

    // Link workflow to proposal if we have one
    if (finalProposalId) {
      await updateProposalWorkflowData(userId, finalProposalId, {
        workflowRunId: workflowId,
        intakeData,
      });
    }

    // Create the initial intake task
    await createTask({
      workflowRunId: workflowId,
      userId,
      taskType: "intake",
      targetEntity: "intake_questionnaire",
      input: { questionnaire: intakeData },
      priority: 100,
    });

    // Start the workflow
    await startWorkflowRun(userId, workflowId);

    console.log(`[Workflow] Started workflow ${workflowId} (${workflowType})`);

    return res.status(200).json({
      success: true,
      workflowId,
      proposalId: finalProposalId,
    });
  } catch (error) {
    console.error("[Workflow] Error starting workflow:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to start workflow",
    });
  }
}

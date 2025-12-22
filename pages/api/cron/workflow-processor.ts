// pages/api/cron/workflow-processor.ts
// Cron job that processes ready workflow tasks (runs every minute)

import type { NextApiRequest, NextApiResponse } from "next";
import { getIncompleteWorkflows } from "../../../lib/database";
import { processWorkflow } from "../../../lib/workflow/task-processor";
import { recoverIncompleteWorkflows } from "../../../lib/workflow/recovery";

interface ProcessorResponse {
  success: boolean;
  processed: number;
  workflows: Array<{
    id: string;
    tasksProcessed: number;
    succeeded: number;
    failed: number;
    stageAdvanced: boolean;
  }>;
  recovery?: {
    workflowsRecovered: number;
    tasksReset: number;
  };
  error?: string;
}

// Verify cron secret for security
function verifyCronSecret(req: NextApiRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If no secret configured, allow in development
    return process.env.NODE_ENV === "development";
  }

  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${cronSecret}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessorResponse>
) {
  // Only allow GET (Vercel cron) or POST (manual trigger)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      success: false,
      processed: 0,
      workflows: [],
      error: "Method not allowed",
    });
  }

  // Verify authorization
  if (!verifyCronSecret(req)) {
    return res.status(401).json({
      success: false,
      processed: 0,
      workflows: [],
      error: "Unauthorized",
    });
  }

  try {
    console.log("[Cron] Starting workflow processor...");

    // First, recover any stale workflows
    const recovery = await recoverIncompleteWorkflows();

    if (recovery.tasksReset > 0) {
      console.log(`[Cron] Recovered ${recovery.workflowsRecovered} workflows, reset ${recovery.tasksReset} tasks`);
    }

    // Get all running workflows
    const runningWorkflows = await getIncompleteWorkflows();

    if (runningWorkflows.length === 0) {
      console.log("[Cron] No running workflows to process");
      return res.status(200).json({
        success: true,
        processed: 0,
        workflows: [],
        recovery: {
          workflowsRecovered: recovery.workflowsRecovered,
          tasksReset: recovery.tasksReset,
        },
      });
    }

    console.log(`[Cron] Processing ${runningWorkflows.length} active workflows`);

    const results: ProcessorResponse["workflows"] = [];
    let totalProcessed = 0;

    // Process each workflow
    for (const workflow of runningWorkflows) {
      try {
        const result = await processWorkflow(workflow.id);

        results.push({
          id: workflow.id,
          tasksProcessed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
          stageAdvanced: result.stageAdvanced,
        });

        totalProcessed += result.processed;

        console.log(
          `[Cron] Workflow ${workflow.id}: processed ${result.processed} tasks ` +
          `(${result.succeeded} succeeded, ${result.failed} failed)` +
          (result.stageAdvanced ? " - Stage advanced!" : "")
        );
      } catch (error) {
        console.error(`[Cron] Error processing workflow ${workflow.id}:`, error);
        results.push({
          id: workflow.id,
          tasksProcessed: 0,
          succeeded: 0,
          failed: 0,
          stageAdvanced: false,
        });
      }
    }

    console.log(`[Cron] Completed. Total tasks processed: ${totalProcessed}`);

    return res.status(200).json({
      success: true,
      processed: totalProcessed,
      workflows: results,
      recovery: {
        workflowsRecovered: recovery.workflowsRecovered,
        tasksReset: recovery.tasksReset,
      },
    });
  } catch (error) {
    console.error("[Cron] Workflow processor error:", error);
    return res.status(500).json({
      success: false,
      processed: 0,
      workflows: [],
      error: error instanceof Error ? error.message : "Processor failed",
    });
  }
}

// Configure for longer timeout (cron jobs may take time)
export const config = {
  api: {
    bodyParser: true,
  },
  maxDuration: 60, // 60 seconds for processing
};

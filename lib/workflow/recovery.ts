// lib/workflow/recovery.ts
// Crash recovery for incomplete workflows

import { db, workflowRuns, workflowTasks, eq, and } from "../db";
import { sql } from "drizzle-orm";
import type { RecoveryResult } from "./types";

// Time threshold for considering a task "stale" (5 minutes)
const STALE_TASK_THRESHOLD_MS = 5 * 60 * 1000;

// Recover all incomplete workflows
export async function recoverIncompleteWorkflows(): Promise<RecoveryResult> {
  const errors: string[] = [];
  let workflowsRecovered = 0;
  let tasksReset = 0;

  try {
    console.log("[Recovery] Starting workflow recovery check...");

    // Find workflows that are stuck in "running" state
    const stuckWorkflows = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.status, "running"));

    for (const workflow of stuckWorkflows) {
      try {
        // Check if there are any running tasks that are stale
        const staleTasks = await findStaleTasks(workflow.id);

        if (staleTasks.length > 0) {
          console.log(
            `[Recovery] Found ${staleTasks.length} stale tasks in workflow ${workflow.id}`
          );

          // Reset stale tasks to queued
          for (const task of staleTasks) {
            await resetStaleTask(task.id);
            tasksReset++;
          }

          workflowsRecovered++;
        }
      } catch (error) {
        const msg = `Failed to recover workflow ${workflow.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`[Recovery] ${msg}`);
        errors.push(msg);
      }
    }

    // Find workflows that are paused for too long (more than 24 hours)
    const pausedWorkflows = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.status, "paused"));

    for (const workflow of pausedWorkflows) {
      if (workflow.pausedAt) {
        const pausedDuration = Date.now() - new Date(workflow.pausedAt).getTime();
        const PAUSED_WARNING_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

        if (pausedDuration > PAUSED_WARNING_THRESHOLD) {
          console.log(
            `[Recovery] Warning: Workflow ${workflow.id} has been paused for more than 24 hours`
          );
        }
      }
    }

    console.log(
      `[Recovery] Recovery complete. Recovered ${workflowsRecovered} workflows, reset ${tasksReset} tasks`
    );

    return {
      workflowsRecovered,
      tasksReset,
      errors,
    };
  } catch (error) {
    const msg = `Recovery process failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    console.error(`[Recovery] ${msg}`);
    errors.push(msg);

    return {
      workflowsRecovered,
      tasksReset,
      errors,
    };
  }
}

// Find tasks that are stuck in "running" state
async function findStaleTasks(workflowRunId: string) {
  const staleThreshold = new Date(Date.now() - STALE_TASK_THRESHOLD_MS);

  // Get all running tasks that started before the threshold
  const staleTasks = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        eq(workflowTasks.status, "running"),
        sql`${workflowTasks.startedAt} < ${staleThreshold}`
      )
    );

  return staleTasks;
}

// Reset a stale task to queued status
async function resetStaleTask(taskId: string): Promise<void> {
  const [task] = await db
    .select()
    .from(workflowTasks)
    .where(eq(workflowTasks.id, taskId))
    .limit(1);

  if (!task) return;

  const attempt = (task.attempt || 1) + 1;
  const canRetry = attempt <= (task.maxAttempts || 3);

  await db
    .update(workflowTasks)
    .set({
      status: canRetry ? "queued" : "failed",
      attempt,
      errorMessage: canRetry
        ? "Task was stale and has been reset for retry"
        : "Task exceeded max retry attempts after stale recovery",
      startedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(workflowTasks.id, taskId));

  console.log(
    `[Recovery] Reset task ${taskId} (attempt ${attempt}/${task.maxAttempts || 3})`
  );
}

// Pause a workflow (user requested or error threshold reached)
export async function pauseWorkflow(
  workflowRunId: string,
  reason: string
): Promise<void> {
  await db
    .update(workflowRuns)
    .set({
      status: "paused",
      pausedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));

  // Log the pause reason
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, workflowRunId))
    .limit(1);

  if (run) {
    const errorLog = (run.errorLog || []) as Array<{
      stage: string;
      task: string;
      error: string;
      timestamp: string;
    }>;

    errorLog.push({
      stage: run.currentStage || "unknown",
      task: "workflow",
      error: `Workflow paused: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    await db
      .update(workflowRuns)
      .set({ errorLog, updatedAt: new Date() })
      .where(eq(workflowRuns.id, workflowRunId));
  }

  console.log(`[Recovery] Paused workflow ${workflowRunId}: ${reason}`);
}

// Resume a paused workflow
export async function resumeWorkflow(workflowRunId: string): Promise<void> {
  await db
    .update(workflowRuns)
    .set({
      status: "running",
      pausedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));

  console.log(`[Recovery] Resumed workflow ${workflowRunId}`);
}

// Cancel a workflow
export async function cancelWorkflow(
  workflowRunId: string,
  reason: string
): Promise<void> {
  // Cancel all pending/queued tasks
  await db
    .update(workflowTasks)
    .set({
      status: "failed",
      errorMessage: `Workflow cancelled: ${reason}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        sql`${workflowTasks.status} IN ('queued', 'running')`
      )
    );

  // Mark workflow as failed
  await db
    .update(workflowRuns)
    .set({
      status: "failed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));

  console.log(`[Recovery] Cancelled workflow ${workflowRunId}: ${reason}`);
}

// Get workflow health status
export async function getWorkflowHealth(workflowRunId: string): Promise<{
  status: "healthy" | "warning" | "critical";
  issues: string[];
  staleTasks: number;
  failedTasks: number;
  blockedTasks: number;
}> {
  const issues: string[] = [];

  // Get workflow
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, workflowRunId))
    .limit(1);

  if (!run) {
    return {
      status: "critical",
      issues: ["Workflow not found"],
      staleTasks: 0,
      failedTasks: 0,
      blockedTasks: 0,
    };
  }

  // Count stale tasks
  const staleTasks = await findStaleTasks(workflowRunId);

  // Count failed tasks
  const failedTasks = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        eq(workflowTasks.status, "failed")
      )
    );

  // Count blocked tasks
  const blockedTasks = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        eq(workflowTasks.status, "blocked_user")
      )
    );

  if (staleTasks.length > 0) {
    issues.push(`${staleTasks.length} tasks are stale and may be stuck`);
  }

  if (failedTasks.length > 0) {
    issues.push(`${failedTasks.length} tasks have failed`);
  }

  if (blockedTasks.length > 0) {
    issues.push(`${blockedTasks.length} tasks are waiting for user input`);
  }

  // Determine overall status
  let status: "healthy" | "warning" | "critical" = "healthy";

  if (staleTasks.length > 3 || failedTasks.length > 5) {
    status = "critical";
  } else if (staleTasks.length > 0 || failedTasks.length > 0 || blockedTasks.length > 0) {
    status = "warning";
  }

  return {
    status,
    issues,
    staleTasks: staleTasks.length,
    failedTasks: failedTasks.length,
    blockedTasks: blockedTasks.length,
  };
}

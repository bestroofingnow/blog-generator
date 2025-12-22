// lib/workflow/state-machine.ts
// State machine for workflow orchestration

import { db, workflowRuns, workflowTasks, eq, and, desc } from "../db";
import type { WorkflowRun, WorkflowTask, WorkflowStage, TaskStatus, StageProgress } from "../db";
import {
  STAGE_ORDER,
  STAGE_AGENTS,
  type CreateTaskParams,
  type WorkflowState,
  type DependencyCheck,
  type StageCompletion,
} from "./types";

// Get the next stage in the workflow
export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

// Get the previous stage in the workflow
export function getPreviousStage(currentStage: WorkflowStage): WorkflowStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return STAGE_ORDER[currentIndex - 1];
}

// Check if a stage can advance to the next
export async function canAdvanceStage(
  workflowRunId: string,
  currentStage: WorkflowStage
): Promise<{ canAdvance: boolean; reason?: string }> {
  // Get all tasks for this stage
  const stageTasks = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        eq(workflowTasks.taskType, currentStage)
      )
    );

  // If no tasks exist for this stage, it hasn't started
  if (stageTasks.length === 0) {
    return { canAdvance: false, reason: "No tasks created for this stage" };
  }

  // Check if all tasks are complete
  const incompleteTasks = stageTasks.filter(
    (t) => t.status !== "done" && t.status !== "failed"
  );

  if (incompleteTasks.length > 0) {
    return {
      canAdvance: false,
      reason: `${incompleteTasks.length} tasks still pending`,
    };
  }

  // Check if there are too many failures
  const failedTasks = stageTasks.filter((t) => t.status === "failed");
  const failureRate = failedTasks.length / stageTasks.length;

  if (failureRate > 0.5) {
    return {
      canAdvance: false,
      reason: `High failure rate: ${failedTasks.length}/${stageTasks.length} tasks failed`,
    };
  }

  return { canAdvance: true };
}

// Advance the workflow to the next stage
export async function advanceStage(workflowRunId: string): Promise<WorkflowStage | null> {
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, workflowRunId))
    .limit(1);

  if (!run || !run.currentStage) {
    return null;
  }

  const nextStage = getNextStage(run.currentStage as WorkflowStage);

  if (!nextStage) {
    // Workflow complete
    await db
      .update(workflowRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflowRuns.id, workflowRunId));
    return null;
  }

  // Update stage progress
  const stageProgress = (run.stageProgress || {}) as Record<string, StageProgress>;
  stageProgress[run.currentStage] = {
    ...stageProgress[run.currentStage],
    status: "completed",
  };
  stageProgress[nextStage] = {
    completed: 0,
    total: 0,
    status: "running",
  };

  await db
    .update(workflowRuns)
    .set({
      currentStage: nextStage,
      stageProgress,
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));

  return nextStage;
}

// Get all ready tasks (dependencies met, not running)
export async function getReadyTasks(workflowRunId: string): Promise<WorkflowTask[]> {
  // Get all queued tasks
  const queuedTasks = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        eq(workflowTasks.status, "queued")
      )
    )
    .orderBy(desc(workflowTasks.priority));

  // Filter to tasks with met dependencies
  const readyTasks: WorkflowTask[] = [];

  for (const task of queuedTasks) {
    const depCheck = await areDependenciesMet(task);
    if (depCheck.allMet) {
      readyTasks.push(task);
    }
  }

  return readyTasks;
}

// Check if all dependencies are met for a task
export async function areDependenciesMet(task: WorkflowTask): Promise<DependencyCheck> {
  const dependsOn = (task.dependsOn || []) as string[];

  if (dependsOn.length === 0) {
    return { allMet: true, unmetDependencies: [], missingTasks: [] };
  }

  // Get all dependency tasks
  const depTasks = await Promise.all(
    dependsOn.map(async (depId) => {
      const [depTask] = await db
        .select()
        .from(workflowTasks)
        .where(eq(workflowTasks.id, depId))
        .limit(1);
      return { id: depId, task: depTask };
    })
  );

  const unmetDependencies: string[] = [];
  const missingTasks: string[] = [];

  for (const { id, task: depTask } of depTasks) {
    if (!depTask) {
      missingTasks.push(id);
    } else if (depTask.status !== "done") {
      unmetDependencies.push(id);
    }
  }

  return {
    allMet: unmetDependencies.length === 0 && missingTasks.length === 0,
    unmetDependencies,
    missingTasks,
  };
}

// Start a task (mark as running)
export async function startTask(taskId: string): Promise<WorkflowTask | null> {
  const [updated] = await db
    .update(workflowTasks)
    .set({
      status: "running",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowTasks.id, taskId))
    .returning();

  return updated || null;
}

// Complete a task successfully
export async function completeTask(
  taskId: string,
  output: Record<string, unknown>
): Promise<WorkflowTask | null> {
  const [updated] = await db
    .update(workflowTasks)
    .set({
      status: "done",
      output,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowTasks.id, taskId))
    .returning();

  if (updated) {
    // Update stage progress
    await updateStageProgress(updated.workflowRunId, updated.taskType as WorkflowStage);
  }

  return updated || null;
}

// Fail a task
export async function failTask(
  taskId: string,
  errorMessage: string
): Promise<{ task: WorkflowTask | null; canRetry: boolean }> {
  const [task] = await db
    .select()
    .from(workflowTasks)
    .where(eq(workflowTasks.id, taskId))
    .limit(1);

  if (!task) {
    return { task: null, canRetry: false };
  }

  const attempt = (task.attempt || 1) + 1;
  const canRetry = attempt <= (task.maxAttempts || 3);

  const [updated] = await db
    .update(workflowTasks)
    .set({
      status: canRetry ? "queued" : "failed",
      attempt,
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(workflowTasks.id, taskId))
    .returning();

  if (updated && !canRetry) {
    // Log the failure to the workflow
    await logWorkflowError(updated.workflowRunId, {
      stage: updated.taskType,
      task: updated.targetEntity || taskId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }

  return { task: updated || null, canRetry };
}

// Create a new task
export async function createTask(params: CreateTaskParams): Promise<WorkflowTask> {
  const [task] = await db
    .insert(workflowTasks)
    .values({
      workflowRunId: params.workflowRunId,
      userId: params.userId,
      taskType: params.taskType,
      targetEntity: params.targetEntity,
      priority: params.priority || 0,
      dependsOn: params.dependsOn || [],
      input: params.input || {},
      agentAssigned: params.agentAssigned || STAGE_AGENTS[params.taskType],
      status: "queued",
      attempt: 1,
      maxAttempts: 3,
    })
    .returning();

  // Update stage progress
  await updateStageProgress(params.workflowRunId, params.taskType);

  return task;
}

// Update stage progress counts
async function updateStageProgress(
  workflowRunId: string,
  stage: WorkflowStage
): Promise<void> {
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, workflowRunId))
    .limit(1);

  if (!run) return;

  // Count tasks for this stage
  const stageTasks = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        eq(workflowTasks.taskType, stage)
      )
    );

  const completed = stageTasks.filter((t) => t.status === "done").length;
  const failed = stageTasks.filter((t) => t.status === "failed").length;
  const total = stageTasks.length;

  const stageProgress = (run.stageProgress || {}) as Record<string, StageProgress>;
  stageProgress[stage] = {
    completed,
    total,
    status:
      completed === total && total > 0
        ? "completed"
        : failed > total / 2
          ? "failed"
          : "running",
  };

  await db
    .update(workflowRuns)
    .set({
      stageProgress,
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));
}

// Log an error to the workflow
async function logWorkflowError(
  workflowRunId: string,
  error: { stage: string; task: string; error: string; timestamp: string }
): Promise<void> {
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, workflowRunId))
    .limit(1);

  if (!run) return;

  const errorLog = (run.errorLog || []) as Array<typeof error>;
  errorLog.push(error);

  await db
    .update(workflowRuns)
    .set({
      errorLog,
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, workflowRunId));
}

// Get workflow state
export async function getWorkflowState(workflowRunId: string): Promise<WorkflowState | null> {
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, workflowRunId))
    .limit(1);

  if (!run) return null;

  const tasks = await db
    .select()
    .from(workflowTasks)
    .where(eq(workflowTasks.workflowRunId, workflowRunId))
    .orderBy(desc(workflowTasks.priority));

  const readyTasks = await getReadyTasks(workflowRunId);

  return {
    run,
    tasks,
    readyTasks,
    blockedTasks: tasks.filter((t) => t.status === "queued" && !readyTasks.includes(t)),
    completedTasks: tasks.filter((t) => t.status === "done"),
    failedTasks: tasks.filter((t) => t.status === "failed"),
  };
}

// Get stage completion status
export async function getStageCompletion(
  workflowRunId: string,
  stage: WorkflowStage
): Promise<StageCompletion> {
  const stageTasks = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.workflowRunId, workflowRunId),
        eq(workflowTasks.taskType, stage)
      )
    );

  const completed = stageTasks.filter((t) => t.status === "done").length;
  const failed = stageTasks.filter((t) => t.status === "failed").length;
  const pending = stageTasks.filter(
    (t) => t.status === "queued" || t.status === "running"
  ).length;

  return {
    stage,
    isComplete: completed === stageTasks.length && stageTasks.length > 0,
    totalTasks: stageTasks.length,
    completedTasks: completed,
    failedTasks: failed,
    pendingTasks: pending,
  };
}

// Block a task (waiting for user input)
export async function blockTask(taskId: string, reason: string): Promise<WorkflowTask | null> {
  const [updated] = await db
    .update(workflowTasks)
    .set({
      status: "blocked_user",
      errorMessage: reason,
      updatedAt: new Date(),
    })
    .where(eq(workflowTasks.id, taskId))
    .returning();

  return updated || null;
}

// Unblock a task after user input
export async function unblockTask(
  taskId: string,
  additionalInput?: Record<string, unknown>
): Promise<WorkflowTask | null> {
  const [task] = await db
    .select()
    .from(workflowTasks)
    .where(eq(workflowTasks.id, taskId))
    .limit(1);

  if (!task) return null;

  const input = { ...(task.input as object || {}), ...additionalInput };

  const [updated] = await db
    .update(workflowTasks)
    .set({
      status: "queued",
      input,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(workflowTasks.id, taskId))
    .returning();

  return updated || null;
}

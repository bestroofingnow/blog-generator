// lib/workflow/task-processor.ts
// Task processor that routes tasks to appropriate AI agents

import type { WorkflowTask, WorkflowStage, TaskOutput } from "../db";
import {
  startTask,
  completeTask,
  failTask,
  createTask,
  advanceStage,
  canAdvanceStage,
  getReadyTasks,
} from "./state-machine";
import { STAGE_AGENTS, type TaskExecutionResult, type CreateTaskParams } from "./types";

// Task handler function type
type TaskHandler = (task: WorkflowTask) => Promise<TaskExecutionResult>;

// Registry of task handlers by stage
const taskHandlers: Partial<Record<WorkflowStage, TaskHandler>> = {};

// Register a task handler for a stage
export function registerTaskHandler(stage: WorkflowStage, handler: TaskHandler): void {
  taskHandlers[stage] = handler;
}

// Process a single task
export async function processTask(task: WorkflowTask): Promise<TaskExecutionResult> {
  const handler = taskHandlers[task.taskType as WorkflowStage];

  if (!handler) {
    return {
      success: false,
      error: `No handler registered for task type: ${task.taskType}`,
    };
  }

  // Mark task as running
  await startTask(task.id);

  try {
    // Execute the task handler
    const result = await handler(task);

    if (result.success) {
      // Complete the task
      await completeTask(task.id, result.output || {});

      // Create any follow-up tasks
      if (result.nextTasks && result.nextTasks.length > 0) {
        for (const nextTask of result.nextTasks) {
          await createTask(nextTask);
        }
      }
    } else {
      // Fail the task
      const { canRetry } = await failTask(task.id, result.error || "Unknown error");

      if (canRetry) {
        console.log(`[TaskProcessor] Task ${task.id} failed, will retry. Error: ${result.error}`);
      } else {
        console.error(`[TaskProcessor] Task ${task.id} failed permanently. Error: ${result.error}`);
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await failTask(task.id, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Process all ready tasks in a workflow
export async function processWorkflow(workflowRunId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  stageAdvanced: boolean;
}> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let stageAdvanced = false;

  // Get ready tasks
  const readyTasks = await getReadyTasks(workflowRunId);

  if (readyTasks.length === 0) {
    // Check if we can advance to next stage
    const tasks = await import("../db").then((m) =>
      m.db
        .select()
        .from(m.workflowRuns)
        .where(m.eq(m.workflowRuns.id, workflowRunId))
        .limit(1)
    );

    const run = tasks[0];
    if (run?.currentStage) {
      const { canAdvance } = await canAdvanceStage(
        workflowRunId,
        run.currentStage as WorkflowStage
      );

      if (canAdvance) {
        const nextStage = await advanceStage(workflowRunId);
        stageAdvanced = nextStage !== null;

        if (stageAdvanced) {
          console.log(`[TaskProcessor] Workflow ${workflowRunId} advanced to stage: ${nextStage}`);
        }
      }
    }

    return { processed, succeeded, failed, stageAdvanced };
  }

  // Process tasks in parallel (with concurrency limit)
  const CONCURRENCY_LIMIT = 5;
  const batches = [];

  for (let i = 0; i < readyTasks.length; i += CONCURRENCY_LIMIT) {
    batches.push(readyTasks.slice(i, i + CONCURRENCY_LIMIT));
  }

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async (task) => {
        const result = await processTask(task);
        return result;
      })
    );

    for (const result of results) {
      processed++;
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }
  }

  // Check if stage can advance after processing
  const tasksAfter = await import("../db").then((m) =>
    m.db
      .select()
      .from(m.workflowRuns)
      .where(m.eq(m.workflowRuns.id, workflowRunId))
      .limit(1)
  );

  const runAfter = tasksAfter[0];
  if (runAfter?.currentStage) {
    const { canAdvance } = await canAdvanceStage(
      workflowRunId,
      runAfter.currentStage as WorkflowStage
    );

    if (canAdvance) {
      const nextStage = await advanceStage(workflowRunId);
      stageAdvanced = nextStage !== null;
    }
  }

  return { processed, succeeded, failed, stageAdvanced };
}

// Create initial tasks for a stage
export async function createStageTasks(
  workflowRunId: string,
  userId: string,
  stage: WorkflowStage,
  entities: Array<{ id: string; input?: Record<string, unknown>; dependsOn?: string[] }>
): Promise<WorkflowTask[]> {
  const tasks: WorkflowTask[] = [];

  for (const entity of entities) {
    const task = await createTask({
      workflowRunId,
      userId,
      taskType: stage,
      targetEntity: entity.id,
      input: entity.input,
      dependsOn: entity.dependsOn,
      agentAssigned: STAGE_AGENTS[stage],
    });
    tasks.push(task);
  }

  return tasks;
}

// Helper to create dependent tasks for per-page operations
export function createPageDependencies(
  pages: Array<{ slug: string; title: string }>,
  previousStageTasks: WorkflowTask[]
): Array<{ id: string; dependsOn: string[] }> {
  // Map previous tasks by target entity
  const previousTaskMap = new Map<string, string>();
  for (const task of previousStageTasks) {
    if (task.targetEntity) {
      previousTaskMap.set(task.targetEntity, task.id);
    }
  }

  return pages.map((page) => ({
    id: page.slug,
    dependsOn: previousTaskMap.has(page.slug) ? [previousTaskMap.get(page.slug)!] : [],
  }));
}

// Get the appropriate model for a stage
export function getModelForStage(stage: WorkflowStage): string {
  const modelMap: Record<WorkflowStage, string> = {
    intake: "meta/llama-4-maverick",
    research: "google/gemini-2.5-flash-preview-09-2025",
    kb_build: "meta/llama-4-maverick",
    sitemap: "moonshotai/kimi-k2",
    blueprint: "moonshotai/kimi-k2",
    copywrite: "anthropic/claude-sonnet-4",
    image_generate: "google/imagen-4.0-generate",
    image_qa: "anthropic/claude-sonnet-4",
    image_fix: "google/gemini-2.5-flash-preview-09-2025",
    image_store: "google/imagen-4.0-generate",
    codegen: "moonshotai/kimi-k2",
    qa_site: "anthropic/claude-sonnet-4",
    publish: "moonshotai/kimi-k2",
  };

  return modelMap[stage];
}

// Export handler registration for use by stage APIs
export { taskHandlers };

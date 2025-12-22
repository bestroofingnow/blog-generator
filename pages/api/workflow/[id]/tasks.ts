// pages/api/workflow/[id]/tasks.ts
// List and manage workflow tasks

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getWorkflowRun, getWorkflowTasks, getWorkflowTask, getImageQaLogs } from "../../../../lib/database";
import { unblockTask, failTask, createTask } from "../../../../lib/workflow/state-machine";
import type { WorkflowTask, WorkflowStage, ImageQaLog } from "../../../../lib/db";

interface TasksResponse {
  success: boolean;
  tasks?: WorkflowTask[];
  task?: WorkflowTask;
  qaLogs?: ImageQaLog[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TasksResponse>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { id, taskId, stage, status } = req.query;
  const workflowId = Array.isArray(id) ? id[0] : id;

  if (!workflowId) {
    return res.status(400).json({ success: false, error: "Workflow ID required" });
  }

  // Verify workflow belongs to user
  const workflow = await getWorkflowRun(userId, workflowId);
  if (!workflow) {
    return res.status(404).json({ success: false, error: "Workflow not found" });
  }

  if (req.method === "GET") {
    return handleGet(workflowId, taskId as string | undefined, stage as string | undefined, status as string | undefined, res);
  } else if (req.method === "POST") {
    return handlePost(workflowId, userId, req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGet(
  workflowId: string,
  taskId: string | undefined,
  stage: string | undefined,
  status: string | undefined,
  res: NextApiResponse<TasksResponse>
) {
  try {
    // If taskId provided, get specific task with QA logs
    if (taskId) {
      const task = await getWorkflowTask(taskId);
      if (!task || task.workflowRunId !== workflowId) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      // Get QA logs if this is an image task
      let qaLogs: ImageQaLog[] = [];
      if (task.taskType === "image_qa" || task.taskType === "image_generate") {
        qaLogs = await getImageQaLogs(taskId);
      }

      return res.status(200).json({ success: true, task, qaLogs });
    }

    // Get all tasks with optional filters
    const tasks = await getWorkflowTasks(workflowId, {
      taskType: stage as WorkflowStage | undefined,
      status: status as "queued" | "running" | "blocked_user" | "failed" | "done" | undefined,
    });

    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error("[Workflow Tasks] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get tasks",
    });
  }
}

async function handlePost(
  workflowId: string,
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse<TasksResponse>
) {
  const { action, taskId, input, taskType, targetEntity, dependsOn } = req.body as {
    action: "unblock" | "retry" | "create";
    taskId?: string;
    input?: Record<string, unknown>;
    taskType?: WorkflowStage;
    targetEntity?: string;
    dependsOn?: string[];
  };

  if (!action) {
    return res.status(400).json({ success: false, error: "Action required" });
  }

  try {
    switch (action) {
      case "unblock": {
        if (!taskId) {
          return res.status(400).json({ success: false, error: "taskId required for unblock" });
        }
        const task = await unblockTask(taskId, input);
        return res.status(200).json({ success: true, task: task || undefined });
      }

      case "retry": {
        if (!taskId) {
          return res.status(400).json({ success: false, error: "taskId required for retry" });
        }
        // Reset the task to queued by calling failTask with a special message
        // then unblocking it
        const existingTask = await getWorkflowTask(taskId);
        if (!existingTask) {
          return res.status(404).json({ success: false, error: "Task not found" });
        }

        // Reset attempt counter and requeue
        const task = await unblockTask(taskId, { _retried: true });
        return res.status(200).json({ success: true, task: task || undefined });
      }

      case "create": {
        if (!taskType) {
          return res.status(400).json({ success: false, error: "taskType required for create" });
        }
        const newTask = await createTask({
          workflowRunId: workflowId,
          userId,
          taskType,
          targetEntity,
          input,
          dependsOn,
        });
        return res.status(200).json({ success: true, task: newTask });
      }

      default:
        return res.status(400).json({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    console.error("[Workflow Tasks] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to perform action",
    });
  }
}

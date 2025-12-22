// pages/api/workflow/stages/image-generate.ts
// Stage G: Image Generation with 3-retry QA loop

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getWorkflowRun, createImageQaLog } from "../../../../lib/database";
import { completeTask, failTask, createTask } from "../../../../lib/workflow/state-machine";
import { registerTaskHandler } from "../../../../lib/workflow/task-processor";
import { generateImageWithQA, type ImageQaAttempt, type EnhancedImageResult } from "../../../../lib/ai-gateway";
import type { WorkflowTask, TaskOutput, WorkflowStage } from "../../../../lib/db";
import type { CreateTaskParams } from "../../../../lib/workflow/types";

interface ImageGenerateRequest {
  workflowId: string;
  taskId: string;
  prompt: string;
  sectionContext: string;
  imageIndex: number;
}

interface ImageGenerateResponse {
  success: boolean;
  image?: {
    base64: string;
    mimeType: string;
    prompt: string;
  };
  attempts?: ImageQaAttempt[];
  usedTextlessFallback?: boolean;
  error?: string;
}

// Register the image generation task handler
registerTaskHandler("image_generate", async (task: WorkflowTask): Promise<{
  success: boolean;
  output?: TaskOutput;
  error?: string;
  nextTasks?: CreateTaskParams[];
}> => {
  const input = task.input as {
    prompt?: string;
    sectionContext?: string;
    imageIndex?: number;
    pageSlug?: string;
  } | null;

  if (!input?.prompt) {
    return {
      success: false,
      error: "No prompt provided for image generation",
    };
  }

  try {
    const result = await generateImageWithQA({
      prompt: input.prompt,
      index: input.imageIndex || 0,
      sectionContext: input.sectionContext || "Blog section",
      onAttempt: async (attempt) => {
        // Log each attempt to the database
        await createImageQaLog(task.id, {
          attempt: attempt.attempt,
          originalPrompt: attempt.originalPrompt,
          claudeApproved: attempt.claudeApproved,
          claudeFeedback: attempt.claudeFeedback,
          kimiApproved: attempt.kimiApproved,
          kimiFeedback: attempt.kimiFeedback,
          textDetected: attempt.textDetected,
          fixPrompt: attempt.fixPrompt,
          regenerationModel: attempt.regenerationModel,
          switchedToTextless: attempt.switchedToTextless,
          textlessPrompt: attempt.textlessPrompt,
          finalApproved: attempt.finalApproved,
        });
      },
    });

    if (result.success && result.image) {
      return {
        success: true,
        output: {
          success: true,
          imageUrl: result.image.base64, // Base64 data URL
          storagePath: undefined, // Will be set after WordPress upload
          usedTextlessFallback: result.usedTextlessFallback,
          attempts: result.attempts.length,
        },
        // Create storage task to upload to WordPress
        nextTasks: [{
          workflowRunId: task.workflowRunId,
          userId: task.userId,
          taskType: "image_store",
          targetEntity: `${input.pageSlug || "page"}_image_${input.imageIndex || 0}`,
          input: {
            imageBase64: result.image.base64,
            imageMimeType: result.image.mimeType,
            altText: input.prompt.substring(0, 125),
            pageSlug: input.pageSlug,
            imageIndex: input.imageIndex,
          },
          dependsOn: [task.id],
        }],
      };
    }

    return {
      success: false,
      error: "All image generation attempts failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Image generation failed",
    };
  }
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImageGenerateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { workflowId, taskId, prompt, sectionContext, imageIndex } = req.body as ImageGenerateRequest;

  if (!workflowId || !prompt) {
    return res.status(400).json({ success: false, error: "workflowId and prompt required" });
  }

  try {
    // Verify workflow belongs to user
    const workflow = await getWorkflowRun(userId, workflowId);
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }

    console.log(`[Image Generate] Starting image generation for workflow ${workflowId}`);

    // Generate image with QA loop
    const result = await generateImageWithQA({
      prompt,
      index: imageIndex || 0,
      sectionContext: sectionContext || "Blog section",
      onAttempt: async (attempt) => {
        // Log attempt if we have a taskId
        if (taskId) {
          await createImageQaLog(taskId, {
            attempt: attempt.attempt,
            originalPrompt: attempt.originalPrompt,
            claudeApproved: attempt.claudeApproved,
            claudeFeedback: attempt.claudeFeedback,
            kimiApproved: attempt.kimiApproved,
            kimiFeedback: attempt.kimiFeedback,
            textDetected: attempt.textDetected,
            fixPrompt: attempt.fixPrompt,
            regenerationModel: attempt.regenerationModel,
            switchedToTextless: attempt.switchedToTextless,
            textlessPrompt: attempt.textlessPrompt,
            finalApproved: attempt.finalApproved,
          });
        }
      },
    });

    // Complete or fail the task if we have a taskId
    if (taskId) {
      if (result.success && result.image) {
        await completeTask(taskId, {
          success: true,
          imageUrl: result.image.base64,
          usedTextlessFallback: result.usedTextlessFallback,
          attempts: result.attempts.length,
        });
      } else {
        await failTask(taskId, "All image generation attempts failed");
      }
    }

    if (result.success && result.image) {
      return res.status(200).json({
        success: true,
        image: {
          base64: result.image.base64,
          mimeType: result.image.mimeType,
          prompt: result.image.prompt,
        },
        attempts: result.attempts,
        usedTextlessFallback: result.usedTextlessFallback,
      });
    }

    return res.status(200).json({
      success: false,
      attempts: result.attempts,
      error: "All image generation attempts failed",
    });
  } catch (error) {
    console.error("[Image Generate] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Image generation failed",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 120, // 2 minutes for image generation
};

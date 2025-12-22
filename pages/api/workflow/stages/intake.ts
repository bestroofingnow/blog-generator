// pages/api/workflow/stages/intake.ts
// Stage A: Intake - Collect business profile and open questions

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { loadUserProfile, updateProposalWorkflowData, getSiteProposal, getWorkflowRun } from "../../../../lib/database";
import { completeTask, createTask, getWorkflowState } from "../../../../lib/workflow/state-machine";
import { registerTaskHandler } from "../../../../lib/workflow/task-processor";
import { generateText } from "ai";
import { MODELS } from "../../../../lib/ai-gateway";
import type { IntakeData, WorkflowTask, TaskOutput, WorkflowStage } from "../../../../lib/db";
import type { CreateTaskParams } from "../../../../lib/workflow/types";

interface IntakeRequest {
  workflowId: string;
  taskId: string;
  intakeData: IntakeData;
}

interface IntakeResponse {
  success: boolean;
  enhancedData?: IntakeData;
  suggestedQuestions?: string[];
  error?: string;
}

// Register the intake task handler
registerTaskHandler("intake", async (task: WorkflowTask): Promise<{
  success: boolean;
  output?: TaskOutput;
  error?: string;
  nextTasks?: CreateTaskParams[];
}> => {
  const input = task.input as { questionnaire?: IntakeData } | null;

  if (!input?.questionnaire) {
    return {
      success: false,
      error: "No intake data provided",
    };
  }

  try {
    // Use Llama to enhance and validate the intake data
    const enhanced = await enhanceIntakeWithAI(input.questionnaire);

    return {
      success: true,
      output: {
        success: true,
        intakeData: enhanced,
      },
      // Create the next task: research
      nextTasks: [{
        workflowRunId: task.workflowRunId,
        userId: task.userId,
        taskType: "research",
        targetEntity: "deep_research",
        input: {
          industry: enhanced.industry,
          location: { city: enhanced.city, state: enhanced.state },
          businessName: enhanced.businessName,
          services: enhanced.services,
        },
        dependsOn: [task.id],
      }],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Intake processing failed",
    };
  }
});

// Enhance intake data using AI
async function enhanceIntakeWithAI(data: IntakeData): Promise<IntakeData> {
  const prompt = `You are a business analyst helping to gather complete information for a website project. Review this intake data and suggest any missing or unclear information.

CURRENT INTAKE DATA:
${JSON.stringify(data, null, 2)}

Analyze the data and:
1. Identify any missing critical information
2. Suggest clarifying questions if needed
3. Infer any obvious information that might be missing (e.g., if they're a plumber in Texas, they likely serve multiple cities)
4. Standardize industry terminology

Return enhanced data in JSON format:
{
  "businessName": "...",
  "industry": "standardized industry name",
  "city": "primary city",
  "state": "full state name",
  "services": ["service1", "service2"],
  "targetAudience": "...",
  "competitors": ["competitor1"],
  "uniqueValue": "what makes them unique",
  "goals": ["goal1", "goal2"],
  "additionalInfo": "any other relevant info",
  "suggestedQuestions": ["question1 if info is missing"]
}

Only include suggestedQuestions if critical information is missing.`;

  try {
    const result = await generateText({
      model: MODELS.conductor,
      prompt,
      maxOutputTokens: 1000,
      temperature: 0.3,
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

    const enhanced = JSON.parse(cleaned.trim());
    return {
      ...data,
      ...enhanced,
    };
  } catch {
    // Return original data if AI enhancement fails
    return data;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IntakeResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { workflowId, taskId, intakeData } = req.body as IntakeRequest;

  if (!workflowId || !intakeData) {
    return res.status(400).json({ success: false, error: "workflowId and intakeData required" });
  }

  try {
    // Verify workflow belongs to user
    const workflow = await getWorkflowRun(userId, workflowId);
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }

    // Enhance the intake data
    const enhancedData = await enhanceIntakeWithAI(intakeData);

    // If we have a task ID, complete it
    if (taskId) {
      await completeTask(taskId, {
        success: true,
        intakeData: enhancedData,
      });

      // Create the research task
      await createTask({
        workflowRunId: workflowId,
        userId,
        taskType: "research",
        targetEntity: "deep_research",
        input: {
          industry: enhancedData.industry,
          location: { city: enhancedData.city, state: enhancedData.state },
          businessName: enhancedData.businessName,
          services: enhancedData.services,
        },
        dependsOn: [taskId],
      });
    }

    // Update proposal with intake data
    if (workflow.proposalId) {
      await updateProposalWorkflowData(userId, workflow.proposalId, {
        intakeData: enhancedData,
      });
    }

    // Check if there are suggested questions
    const suggestedQuestions = (enhancedData as IntakeData & { suggestedQuestions?: string[] }).suggestedQuestions;

    return res.status(200).json({
      success: true,
      enhancedData,
      suggestedQuestions,
    });
  } catch (error) {
    console.error("[Intake] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Intake failed",
    });
  }
}

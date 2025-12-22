// pages/api/workflow/stages/kb-build.ts
// Stage C: Knowledge Base Builder - Consolidate research into KB entries

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getWorkflowRun, getSiteProposal } from "../../../../lib/database";
import { db, knowledgeBase, eq } from "../../../../lib/db";
import { completeTask, createTask } from "../../../../lib/workflow/state-machine";
import { registerTaskHandler } from "../../../../lib/workflow/task-processor";
import { generateText } from "ai";
import { MODELS } from "../../../../lib/ai-gateway";
import type { WorkflowTask, TaskOutput, ResearchData, IntakeData, WorkflowStage } from "../../../../lib/db";
import type { CreateTaskParams } from "../../../../lib/workflow/types";

interface KbBuildRequest {
  workflowId: string;
  taskId: string;
}

interface KbBuildResponse {
  success: boolean;
  entriesCreated?: number;
  categories?: string[];
  error?: string;
}

// Knowledge base categories
const KB_CATEGORIES = [
  "services",
  "usps",
  "facts",
  "locations",
  "certifications",
  "team",
  "faqs",
  "testimonials",
] as const;

// Register the KB build task handler
registerTaskHandler("kb_build", async (task: WorkflowTask): Promise<{
  success: boolean;
  output?: TaskOutput;
  error?: string;
  nextTasks?: CreateTaskParams[];
}> => {
  const input = task.input as {
    research?: ResearchData;
    intake?: IntakeData;
    proposalId?: string;
  } | null;

  if (!input?.research && !input?.intake) {
    return {
      success: false,
      error: "No research or intake data to build KB from",
    };
  }

  try {
    // Generate KB entries using AI
    const entries = await generateKbEntries({
      research: input.research,
      intake: input.intake,
      userId: task.userId,
      workflowRunId: task.workflowRunId,
    });

    return {
      success: true,
      output: {
        success: true,
        entriesCreated: entries.length,
      },
      // Create sitemap task
      nextTasks: [{
        workflowRunId: task.workflowRunId,
        userId: task.userId,
        taskType: "sitemap",
        targetEntity: "site_structure",
        input: {
          proposalId: input.proposalId,
          kbEntriesCount: entries.length,
        },
        dependsOn: [task.id],
      }],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "KB build failed",
    };
  }
});

interface GenerateKbParams {
  research?: ResearchData;
  intake?: IntakeData;
  userId: string;
  workflowRunId: string;
}

async function generateKbEntries(params: GenerateKbParams): Promise<Array<{ category: string; title: string; content: string }>> {
  const { research, intake, userId, workflowRunId } = params;

  const prompt = `You are an expert knowledge base architect. Create structured knowledge base entries from this business research and intake data.

INTAKE DATA:
${intake ? JSON.stringify(intake, null, 2) : "Not provided"}

RESEARCH DATA:
${research ? JSON.stringify(research, null, 2) : "Not provided"}

Create knowledge base entries organized by category. Each entry should be a self-contained fact that can be used by AI content writers.

Categories to populate:
- services: Each service offered with description and benefits
- usps: Unique selling points and differentiators
- facts: General business facts (years in business, team size, certifications)
- locations: Service areas with local details
- faqs: Common questions and answers

For each entry, provide:
- category: one of [services, usps, facts, locations, faqs]
- title: short identifier
- content: detailed content (2-4 sentences)
- confidence: 0-100 based on source reliability
- source: where this info came from (intake, research, inference)

Return JSON array:
[
  {
    "category": "services",
    "title": "Service Name",
    "content": "Detailed description...",
    "confidence": 90,
    "source": "intake"
  }
]

Create 15-25 high-quality entries covering all relevant categories.`;

  try {
    console.log("[KB Build] Generating knowledge base entries with Llama...");

    const result = await generateText({
      model: MODELS.conductor,
      prompt,
      maxOutputTokens: 4000,
      temperature: 0.4,
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

    const entries = JSON.parse(cleaned.trim()) as Array<{
      category: string;
      title: string;
      content: string;
      confidence?: number;
      source?: string;
    }>;

    console.log(`[KB Build] Generated ${entries.length} entries`);

    // Insert entries into database
    const insertedEntries: Array<{ category: string; title: string; content: string }> = [];

    for (const entry of entries) {
      if (entry.category && entry.title && entry.content) {
        try {
          await db.insert(knowledgeBase).values({
            userId,
            workflowRunId,
            category: entry.category,
            title: entry.title,
            content: entry.content,
            source: entry.source || "ai_inference",
            confidence: entry.confidence || 80,
            isAiGenerated: true,
            isVerified: false,
            priority: entry.confidence && entry.confidence > 80 ? 2 : 1,
          });

          insertedEntries.push({
            category: entry.category,
            title: entry.title,
            content: entry.content,
          });
        } catch (insertError) {
          console.error(`[KB Build] Error inserting entry "${entry.title}":`, insertError);
        }
      }
    }

    console.log(`[KB Build] Inserted ${insertedEntries.length} entries into database`);
    return insertedEntries;
  } catch (error) {
    console.error("[KB Build] Error generating entries:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KbBuildResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { workflowId, taskId } = req.body as KbBuildRequest;

  if (!workflowId) {
    return res.status(400).json({ success: false, error: "workflowId required" });
  }

  try {
    // Get workflow and proposal data
    const workflow = await getWorkflowRun(userId, workflowId);
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }

    // Get proposal with research data
    let research: ResearchData | undefined;
    let intake: IntakeData | undefined;

    if (workflow.proposalId) {
      const proposal = await getSiteProposal(userId, workflow.proposalId);
      if (proposal) {
        research = proposal.researchData as ResearchData | undefined;
        intake = proposal.intakeData as IntakeData | undefined;
      }
    }

    console.log(`[KB Build] Building KB for workflow ${workflowId}`);

    // Generate and insert entries
    const entries = await generateKbEntries({
      research,
      intake,
      userId,
      workflowRunId: workflowId,
    });

    // Complete task if provided
    if (taskId) {
      await completeTask(taskId, {
        success: true,
        entriesCreated: entries.length,
      });

      // Create next task (sitemap)
      await createTask({
        workflowRunId: workflowId,
        userId,
        taskType: "sitemap",
        targetEntity: "site_structure",
        input: {
          proposalId: workflow.proposalId,
          kbEntriesCount: entries.length,
        },
        dependsOn: [taskId],
      });
    }

    // Get unique categories
    const categories = Array.from(new Set(entries.map(e => e.category)));

    return res.status(200).json({
      success: true,
      entriesCreated: entries.length,
      categories,
    });
  } catch (error) {
    console.error("[KB Build] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "KB build failed",
    });
  }
}

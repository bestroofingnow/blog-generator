// pages/api/chat.ts
// Main chat API route with streaming and tool-calling support

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { streamText } from "ai";
import { z } from "zod";
import { MODELS } from "../../lib/ai-gateway";
import {
  createConversation,
  getConversation,
  saveConversationMessage,
  getConversationMessages,
  generateConversationTitle,
  loadUserProfile,
} from "../../lib/database";
import {
  getProfileImpl,
  updateProfileImpl,
  updateBrandVoiceImpl,
  generateOutlineImpl,
  generateDraftImpl,
  generateMetaImpl,
  keywordResearchImpl,
  competitorAnalysisImpl,
  listDraftsImpl,
  getDraftImpl,
  saveDraftImpl,
  deleteDraftImpl,
  scheduleDraftImpl,
} from "../../lib/chat/tool-implementations";

// Disable body parsing for streaming
export const config = {
  api: {
    bodyParser: true,
  },
  maxDuration: 120, // 2 minutes for complex tool operations
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authenticate
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = (session.user as { id?: string }).id || session.user?.email || "";

  try {
    const { message, conversationId: inputConversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get or create conversation
    let conversationId = inputConversationId;
    let isNewConversation = false;

    if (!conversationId) {
      const createResult = await createConversation(userId);
      if (!createResult.success || !createResult.conversationId) {
        return res.status(500).json({ error: "Failed to create conversation" });
      }
      conversationId = createResult.conversationId;
      isNewConversation = true;
    } else {
      // Verify conversation belongs to user
      const conversation = await getConversation(userId, conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
    }

    // Save user message
    await saveConversationMessage(userId, conversationId, {
      role: "user",
      content: message,
    });

    // Auto-generate title for new conversations
    if (isNewConversation) {
      await generateConversationTitle(userId, conversationId, message);
    }

    // Load conversation history for context
    const history = await getConversationMessages(userId, conversationId, { limit: 20 });
    const messages = history.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // Load user profile for system context
    const userProfile = await loadUserProfile(userId);
    const companyProfile = userProfile?.companyProfile;

    // Build system prompt
    const systemPrompt = buildSystemPrompt(companyProfile as Record<string, unknown> | null | undefined);

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Create tools with implementations
    const tools = createToolsWithImplementations(userId);

    // Stream the response
    const result = streamText({
      model: MODELS.contentWriter,
      system: systemPrompt,
      messages: messages,
      tools,
      onFinish: async ({ text, toolCalls, toolResults }) => {
        // Save assistant response
        await saveConversationMessage(userId, conversationId, {
          role: "assistant",
          content: text,
          metadata: {
            toolCalls: toolCalls?.map((tc) => ({
              id: tc.toolCallId,
              name: tc.toolName,
              args: (tc as { args?: Record<string, unknown> }).args || {},
            })),
            toolResults: toolResults?.map((tr) => ({
              toolCallId: tr.toolCallId,
              result: (tr as { result?: unknown }).result,
            })),
          },
        });
      },
    });

    // Send conversation ID first
    res.write(`data: ${JSON.stringify({ type: "conversationId", id: conversationId })}\n\n`);

    // Stream text chunks to client
    try {
      for await (const chunk of result.textStream) {
        if (chunk) {
          res.write(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`);
        }
      }

      // Signal completion
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    } catch (streamError) {
      console.error("[Chat] Stream error:", streamError);
      res.write(`data: ${JSON.stringify({ type: "error", error: "Stream interrupted" })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error("[Chat] Error:", error);

    // If headers not sent, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Chat failed",
      });
    }

    // Otherwise send SSE error
    res.write(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Chat failed" })}\n\n`);
    res.end();
  }
}

function buildSystemPrompt(companyProfile?: Record<string, unknown> | null): string {
  let prompt = `You are an AI assistant for a blog generation platform. You help users:
- Manage their company profile and brand settings
- Research keywords and analyze competitors for SEO
- Generate blog outlines and full drafts
- Manage saved drafts (create, edit, schedule, delete)

You have access to tools that let you perform these actions on the user's behalf.
Be helpful, concise, and professional. When using tools, explain what you're doing.
After completing actions, summarize what was done.

Important guidelines:
- For destructive actions (delete), always confirm the user wants to proceed
- When generating content, ask about preferences if not specified
- Provide SEO tips and suggestions proactively when relevant
- If a tool fails, explain what happened and suggest alternatives
`;

  if (companyProfile) {
    const cp = companyProfile as Record<string, unknown>;
    prompt += `\n\nUser's Company Context:
- Company: ${cp.name || "Not set"}
- Industry: ${cp.industryType || "Not set"}
- Location: ${cp.headquarters || "Not set"}, ${cp.state || ""}
- Services: ${Array.isArray(cp.services) ? cp.services.join(", ") : "Not set"}
- Brand Voice: ${cp.brandVoice || "Professional"}
- Target Audience: ${cp.audience || "Not set"}

Use this context to provide personalized recommendations and tailor content generation.`;
  }

  return prompt;
}

function createToolsWithImplementations(userId: string) {
  return {
    // Profile & Settings
    getProfile: {
      description: "Get the user's company profile including business details, branding, services, and settings.",
      inputSchema: z.object({}),
      execute: async () => getProfileImpl(userId),
    },

    updateProfile: {
      description: "Update specific fields in the user's company profile.",
      inputSchema: z.object({
        name: z.string().optional().describe("Company name"),
        tagline: z.string().optional().describe("Company tagline"),
        website: z.string().optional().describe("Website URL"),
        phone: z.string().optional().describe("Phone number"),
        email: z.string().optional().describe("Email address"),
        address: z.string().optional().describe("Physical address"),
        headquarters: z.string().optional().describe("City"),
        state: z.string().optional().describe("State"),
        industryType: z.string().optional().describe("Industry type"),
        yearsInBusiness: z.number().optional().describe("Years in business"),
        audience: z.string().optional().describe("Target audience"),
        services: z.array(z.string()).optional().describe("Services offered"),
        cities: z.array(z.string()).optional().describe("Cities served"),
        usps: z.array(z.string()).optional().describe("Unique selling points"),
        certifications: z.array(z.string()).optional().describe("Certifications"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => updateProfileImpl(userId, params),
    },

    updateBrandVoice: {
      description: "Update the brand voice and writing style settings.",
      inputSchema: z.object({
        brandVoice: z.string().optional().describe("Brand voice description"),
        writingStyle: z.string().optional().describe("Preferred writing style"),
        primarySiteKeyword: z.string().optional().describe("Main keyword"),
        secondarySiteKeywords: z.array(z.string()).optional().describe("Additional keywords"),
        siteDescription: z.string().optional().describe("Site description"),
        businessPersonality: z.string().optional().describe("Business personality"),
        valueProposition: z.string().optional().describe("Value proposition"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => updateBrandVoiceImpl(userId, params),
    },

    // Content Generation
    generateOutline: {
      description: "Generate a blog outline for a given topic with sections and SEO optimization.",
      inputSchema: z.object({
        topic: z.string().describe("Main topic for the blog"),
        location: z.string().optional().describe("Target location for local SEO"),
        blogType: z.enum(["blog", "service", "location"]).default("blog").describe("Content type"),
        numberOfSections: z.number().min(3).max(10).default(5).describe("Number of sections"),
        tone: z.string().optional().describe("Tone of content"),
        primaryKeyword: z.string().optional().describe("Primary keyword"),
        secondaryKeywords: z.array(z.string()).optional().describe("Secondary keywords"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => generateOutlineImpl(userId, params),
    },

    generateDraft: {
      description: "Generate a complete blog draft from a topic. Creates full content ready for review.",
      inputSchema: z.object({
        topic: z.string().describe("Main topic for the blog"),
        location: z.string().optional().describe("Target location"),
        blogType: z.enum(["blog", "service", "location"]).default("blog").describe("Content type"),
        numberOfSections: z.number().min(3).max(10).default(5).describe("Number of sections"),
        wordCountRange: z.object({
          min: z.number().default(800),
          max: z.number().default(1500),
        }).optional().describe("Word count range"),
        tone: z.string().optional().describe("Tone"),
        primaryKeyword: z.string().optional().describe("Primary keyword"),
        secondaryKeywords: z.array(z.string()).optional().describe("Secondary keywords"),
        generateImages: z.boolean().default(false).describe("Whether to generate images"),
        numberOfImages: z.number().min(0).max(5).default(3).describe("Number of images"),
        saveDraft: z.boolean().default(true).describe("Whether to save as draft"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => generateDraftImpl(userId, params),
    },

    generateMeta: {
      description: "Generate SEO meta title and description for a topic.",
      inputSchema: z.object({
        topic: z.string().describe("Topic to generate meta for"),
        primaryKeyword: z.string().optional().describe("Primary keyword"),
        draftId: z.string().optional().describe("Draft ID to update"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => generateMetaImpl(userId, params),
    },

    // SEO Research
    keywordResearch: {
      description: "Perform keyword research for a topic. Finds keywords, competitor insights, and content angles.",
      inputSchema: z.object({
        topic: z.string().describe("Topic to research"),
        location: z.string().optional().describe("Target location"),
        industry: z.string().optional().describe("Industry type"),
        competitorUrls: z.array(z.string()).optional().describe("Competitor URLs"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => keywordResearchImpl(userId, params),
    },

    competitorAnalysis: {
      description: "Analyze competitor content and SEO strategies.",
      inputSchema: z.object({
        competitorUrls: z.array(z.string()).min(1).describe("Competitor URLs"),
        topic: z.string().optional().describe("Topic to focus on"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => competitorAnalysisImpl(userId, params),
    },

    // Draft Management
    listDrafts: {
      description: "List saved drafts with optional filtering.",
      inputSchema: z.object({
        status: z.enum(["draft", "ready", "published", "all"]).default("all").describe("Status filter"),
        type: z.enum(["blog", "service", "location", "all"]).default("all").describe("Type filter"),
        limit: z.number().min(1).max(50).default(20).describe("Max results"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => listDraftsImpl(userId, params),
    },

    getDraft: {
      description: "Get full details of a specific draft.",
      inputSchema: z.object({
        draftId: z.string().describe("Draft ID"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => getDraftImpl(userId, params),
    },

    saveDraft: {
      description: "Create or update a draft.",
      inputSchema: z.object({
        draftId: z.string().optional().describe("Draft ID for updates"),
        title: z.string().describe("Draft title"),
        type: z.enum(["blog", "service", "location"]).describe("Content type"),
        content: z.string().optional().describe("HTML content"),
        slug: z.string().optional().describe("URL slug"),
        seoData: z.object({
          primaryKeyword: z.string().optional(),
          secondaryKeywords: z.array(z.string()).optional(),
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
        }).optional().describe("SEO metadata"),
        status: z.enum(["draft", "ready", "published"]).default("draft").describe("Status"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => saveDraftImpl(userId, params),
    },

    deleteDraft: {
      description: "Delete a draft permanently. Requires confirmation.",
      inputSchema: z.object({
        draftId: z.string().describe("Draft ID to delete"),
        confirmDelete: z.boolean().describe("Must be true to confirm"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => deleteDraftImpl(userId, params),
    },

    scheduleDraft: {
      description: "Schedule a draft for future publication.",
      inputSchema: z.object({
        draftId: z.string().describe("Draft ID to schedule"),
        scheduledDate: z.string().describe("ISO date string"),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => scheduleDraftImpl(userId, params),
    },
  };
}

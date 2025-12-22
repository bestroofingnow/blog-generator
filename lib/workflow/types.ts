// lib/workflow/types.ts
// Type definitions for the workflow orchestration system

import type {
  WorkflowRun,
  WorkflowTask,
  WorkflowStage,
  WorkflowStatus,
  TaskStatus,
  AgentType,
  StageProgress,
  TaskInput,
  TaskOutput,
} from "../db";

// Re-export database types for convenience
export type {
  WorkflowRun,
  WorkflowTask,
  WorkflowStage,
  WorkflowStatus,
  TaskStatus,
  AgentType,
  StageProgress,
  TaskInput,
  TaskOutput,
};

// Stage order for the workflow pipeline
export const STAGE_ORDER: WorkflowStage[] = [
  "intake",
  "research",
  "kb_build",
  "sitemap",
  "blueprint",
  "copywrite",
  "image_generate",
  "image_qa",
  "image_fix",
  "image_store",
  "codegen",
  "qa_site",
  "publish",
];

// Map stages to their assigned agents
export const STAGE_AGENTS: Record<WorkflowStage, AgentType> = {
  intake: "llama",
  research: "gemini", // Also uses Perplexity
  kb_build: "llama",
  sitemap: "kimi",
  blueprint: "kimi",
  copywrite: "claude",
  image_generate: "imagen",
  image_qa: "claude", // Also uses Kimi for dual review
  image_fix: "gemini",
  image_store: "imagen", // Storage operations
  codegen: "kimi",
  qa_site: "claude", // All agents participate
  publish: "kimi", // WordPress integration
};

// Stage metadata for UI display
export const STAGE_METADATA: Record<
  WorkflowStage,
  { label: string; description: string; icon: string }
> = {
  intake: {
    label: "Intake",
    description: "Collect business information",
    icon: "📋",
  },
  research: {
    label: "Research",
    description: "Analyze market and competitors",
    icon: "🔍",
  },
  kb_build: {
    label: "Knowledge Base",
    description: "Build AI knowledge base",
    icon: "🧠",
  },
  sitemap: {
    label: "Sitemap",
    description: "Plan site structure",
    icon: "🗺️",
  },
  blueprint: {
    label: "Blueprints",
    description: "Design page layouts",
    icon: "📐",
  },
  copywrite: {
    label: "Content",
    description: "Write page content",
    icon: "✍️",
  },
  image_generate: {
    label: "Images",
    description: "Generate images",
    icon: "🎨",
  },
  image_qa: {
    label: "Image QA",
    description: "Review image quality",
    icon: "🔎",
  },
  image_fix: {
    label: "Image Fix",
    description: "Fix image issues",
    icon: "🔧",
  },
  image_store: {
    label: "Storage",
    description: "Upload to WordPress",
    icon: "☁️",
  },
  codegen: {
    label: "Compile",
    description: "Generate HTML",
    icon: "💻",
  },
  qa_site: {
    label: "Site QA",
    description: "Final quality check",
    icon: "✅",
  },
  publish: {
    label: "Publish",
    description: "Publish to WordPress",
    icon: "🚀",
  },
};

// Task creation parameters
export interface CreateTaskParams {
  workflowRunId: string;
  userId: string;
  taskType: WorkflowStage;
  targetEntity?: string;
  priority?: number;
  dependsOn?: string[];
  input?: TaskInput;
  agentAssigned?: AgentType;
}

// Workflow creation parameters
export interface CreateWorkflowParams {
  userId: string;
  proposalId?: string;
  workflowType: "site_build" | "blog_batch" | "single_page";
}

// Task execution result
export interface TaskExecutionResult {
  success: boolean;
  output?: TaskOutput;
  error?: string;
  nextTasks?: CreateTaskParams[];
}

// Workflow state for the state machine
export interface WorkflowState {
  run: WorkflowRun;
  tasks: WorkflowTask[];
  readyTasks: WorkflowTask[];
  blockedTasks: WorkflowTask[];
  completedTasks: WorkflowTask[];
  failedTasks: WorkflowTask[];
}

// Dependency resolution result
export interface DependencyCheck {
  allMet: boolean;
  unmetDependencies: string[];
  missingTasks: string[];
}

// Recovery check result
export interface RecoveryResult {
  workflowsRecovered: number;
  tasksReset: number;
  errors: string[];
}

// Stage completion check
export interface StageCompletion {
  stage: WorkflowStage;
  isComplete: boolean;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
}

// Progress update for real-time UI
export interface ProgressUpdate {
  workflowId: string;
  currentStage: WorkflowStage;
  stageProgress: Record<string, StageProgress>;
  overallProgress: number; // 0-100
  currentTask?: {
    id: string;
    type: WorkflowStage;
    entity?: string;
    status: TaskStatus;
  };
  estimatedTimeRemaining?: number; // seconds
}

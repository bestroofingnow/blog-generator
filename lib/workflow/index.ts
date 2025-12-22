// lib/workflow/index.ts
// Workflow orchestration system exports

// Types
export * from "./types";

// State machine
export {
  getNextStage,
  getPreviousStage,
  canAdvanceStage,
  advanceStage,
  getReadyTasks,
  areDependenciesMet,
  startTask,
  completeTask,
  failTask,
  createTask,
  getWorkflowState,
  getStageCompletion,
  blockTask,
  unblockTask,
} from "./state-machine";

// Task processor
export {
  processTask,
  processWorkflow,
  createStageTasks,
  createPageDependencies,
  getModelForStage,
  registerTaskHandler,
} from "./task-processor";

// Recovery
export {
  recoverIncompleteWorkflows,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  getWorkflowHealth,
} from "./recovery";

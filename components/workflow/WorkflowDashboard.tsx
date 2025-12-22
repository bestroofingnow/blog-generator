// components/workflow/WorkflowDashboard.tsx
// Main dashboard for monitoring workflow progress

import { useState, useEffect, useCallback } from "react";
import styles from "../../styles/Workflow.module.css";

interface StageProgress {
  completed: number;
  total: number;
  status: "pending" | "running" | "completed" | "failed";
}

interface WorkflowTask {
  id: string;
  taskType: string;
  targetEntity?: string;
  status: "queued" | "running" | "blocked_user" | "failed" | "done";
  attempt: number;
  maxAttempts: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

interface WorkflowRun {
  id: string;
  workflowType: string;
  status: "pending" | "running" | "paused" | "completed" | "failed";
  currentStage?: string;
  stageProgress?: Record<string, StageProgress>;
  startedAt?: string;
  completedAt?: string;
}

interface HealthStatus {
  status: "healthy" | "warning" | "critical";
  issues: string[];
  staleTasks: number;
  failedTasks: number;
  blockedTasks: number;
}

interface WorkflowDashboardProps {
  workflowId: string;
  onClose?: () => void;
}

const STAGE_INFO: Record<string, { label: string; icon: string; description: string }> = {
  intake: { label: "Intake", icon: "📋", description: "Collecting business information" },
  research: { label: "Research", icon: "🔍", description: "Analyzing market and competitors" },
  kb_build: { label: "Knowledge Base", icon: "🧠", description: "Building AI knowledge base" },
  sitemap: { label: "Sitemap", icon: "🗺️", description: "Planning site structure" },
  blueprint: { label: "Blueprints", icon: "📐", description: "Designing page layouts" },
  copywrite: { label: "Content", icon: "✍️", description: "Writing page content" },
  image_generate: { label: "Images", icon: "🎨", description: "Generating images" },
  image_qa: { label: "Image QA", icon: "🔎", description: "Reviewing image quality" },
  image_fix: { label: "Image Fix", icon: "🔧", description: "Fixing image issues" },
  image_store: { label: "Storage", icon: "☁️", description: "Uploading to WordPress" },
  codegen: { label: "Compile", icon: "💻", description: "Generating HTML" },
  qa_site: { label: "Site QA", icon: "✅", description: "Final quality check" },
  publish: { label: "Publish", icon: "🚀", description: "Publishing to WordPress" },
};

const STAGE_ORDER = [
  "intake", "research", "kb_build", "sitemap", "blueprint",
  "copywrite", "image_generate", "image_qa", "image_fix", "image_store",
  "codegen", "qa_site", "publish"
];

export default function WorkflowDashboard({ workflowId, onClose }: WorkflowDashboardProps) {
  const [workflow, setWorkflow] = useState<WorkflowRun | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}/status`);
      const data = await response.json();

      if (data.success) {
        setWorkflow(data.workflow);
        setTasks(data.tasks || []);
        setHealth(data.health);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds while running
    const interval = setInterval(() => {
      if (workflow?.status === "running") {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStatus, workflow?.status]);

  const handleAction = async (action: "pause" | "resume" | "cancel") => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (data.success) {
        setWorkflow(data.workflow);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", taskId }),
      });

      if (response.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error("Retry failed:", err);
    }
  };

  const getStageStatus = (stage: string): "pending" | "running" | "completed" | "failed" | "current" => {
    if (!workflow?.currentStage) return "pending";

    const currentIndex = STAGE_ORDER.indexOf(workflow.currentStage);
    const stageIndex = STAGE_ORDER.indexOf(stage);

    if (stageIndex < currentIndex) return "completed";
    if (stageIndex === currentIndex) return "current";
    return "pending";
  };

  const getTasksForStage = (stage: string): WorkflowTask[] => {
    return tasks.filter(t => t.taskType === stage);
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchStatus} className={styles.retryButton}>Retry</button>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>
          <h3>Workflow Not Found</h3>
          <p>The requested workflow could not be found.</p>
        </div>
      </div>
    );
  }

  const currentStageIndex = workflow.currentStage ? STAGE_ORDER.indexOf(workflow.currentStage) : 0;
  const overallProgress = Math.round((currentStageIndex / STAGE_ORDER.length) * 100);

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Workflow Dashboard</h2>
          <span className={`${styles.statusBadge} ${styles[workflow.status]}`}>
            {workflow.status.toUpperCase()}
          </span>
        </div>
        <div className={styles.headerActions}>
          {workflow.status === "running" && (
            <button onClick={() => handleAction("pause")} className={styles.actionButton}>
              Pause
            </button>
          )}
          {workflow.status === "paused" && (
            <button onClick={() => handleAction("resume")} className={styles.actionButton}>
              Resume
            </button>
          )}
          {(workflow.status === "running" || workflow.status === "paused") && (
            <button onClick={() => handleAction("cancel")} className={styles.cancelButton}>
              Cancel
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className={styles.closeButton}>×</button>
          )}
        </div>
      </div>

      {/* Health Warning */}
      {health && health.status !== "healthy" && (
        <div className={`${styles.healthBanner} ${styles[health.status]}`}>
          <strong>{health.status === "warning" ? "⚠️ Warning" : "🚨 Critical"}</strong>
          <ul>
            {health.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall Progress */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${overallProgress}%` }} />
        </div>
        <div className={styles.currentStage}>
          {workflow.currentStage && STAGE_INFO[workflow.currentStage] && (
            <>
              <span className={styles.stageIcon}>{STAGE_INFO[workflow.currentStage].icon}</span>
              <span>{STAGE_INFO[workflow.currentStage].description}</span>
            </>
          )}
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className={styles.pipeline}>
        {STAGE_ORDER.map((stage, index) => {
          const stageInfo = STAGE_INFO[stage];
          const stageStatus = getStageStatus(stage);
          const stageTasks = getTasksForStage(stage);
          const isExpanded = expandedStage === stage;

          return (
            <div key={stage} className={styles.stageWrapper}>
              <div
                className={`${styles.stageCard} ${styles[stageStatus]}`}
                onClick={() => setExpandedStage(isExpanded ? null : stage)}
              >
                <span className={styles.stageIcon}>{stageInfo.icon}</span>
                <span className={styles.stageName}>{stageInfo.label}</span>
                {stageTasks.length > 0 && (
                  <span className={styles.taskCount}>
                    {stageTasks.filter(t => t.status === "done").length}/{stageTasks.length}
                  </span>
                )}
              </div>

              {/* Expanded Stage Details */}
              {isExpanded && stageTasks.length > 0 && (
                <div className={styles.taskList}>
                  {stageTasks.map(task => (
                    <div key={task.id} className={`${styles.taskItem} ${styles[task.status]}`}>
                      <div className={styles.taskHeader}>
                        <span className={styles.taskEntity}>{task.targetEntity || "Task"}</span>
                        <span className={`${styles.taskStatus} ${styles[task.status]}`}>
                          {task.status}
                        </span>
                      </div>
                      {task.status === "failed" && (
                        <div className={styles.taskError}>
                          <p>{task.errorMessage}</p>
                          {task.attempt < task.maxAttempts && (
                            <button
                              onClick={() => handleRetryTask(task.id)}
                              className={styles.retryButton}
                            >
                              Retry ({task.attempt}/{task.maxAttempts})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Connector */}
              {index < STAGE_ORDER.length - 1 && (
                <div className={`${styles.connector} ${stageStatus === "completed" ? styles.active : ""}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className={styles.statsFooter}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{tasks.filter(t => t.status === "done").length}</span>
          <span className={styles.statLabel}>Completed</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{tasks.filter(t => t.status === "running").length}</span>
          <span className={styles.statLabel}>Running</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{tasks.filter(t => t.status === "queued").length}</span>
          <span className={styles.statLabel}>Queued</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{tasks.filter(t => t.status === "failed").length}</span>
          <span className={styles.statLabel}>Failed</span>
        </div>
      </div>
    </div>
  );
}

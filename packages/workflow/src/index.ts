export const workflowLabels = { queued: "Queued", running: "Running", success: "Complete", error: "Needs attention", idle: "Ready" } as const;
export type WorkflowStage = { id:string; label:string; state:"idle"|"queued"|"running"|"success"|"error"; detail?:string };

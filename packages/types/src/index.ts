export type ProductId = "evidenceflow" | "quotesense" | "webqa" | "flowpilot" | "legacylens";
export type ApiError = { message: string; code?: string; status?: number };
export type WorkflowState = "idle" | "queued" | "running" | "success" | "error";

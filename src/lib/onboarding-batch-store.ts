export interface RowStatus {
  state: "idle" | "running" | "success" | "failure";
  error?: string;
}

export interface StoredBatch {
  templateId: string;
  fileName: string;
  header: string[];
  rows: string[][];
  statuses: RowStatus[];
}

const KEY = "galaxy.onboardingBatch";
const EMPTY: StoredBatch = { templateId: "", fileName: "", header: [], rows: [], statuses: [] };

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Restores the last uploaded batch; any in-flight "running" rows are reset to idle. */
export function loadBatch(): StoredBatch {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredBatch>;
    const header = isStringArray(parsed.header) ? parsed.header : [];
    const rows = Array.isArray(parsed.rows) ? parsed.rows.filter(isStringArray) : [];
    const statuses = Array.isArray(parsed.statuses)
      ? parsed.statuses.map((status) =>
          status && status.state === "success"
            ? { state: "success" as const }
            : status && status.state === "failure"
              ? { state: "failure" as const, error: typeof status.error === "string" ? status.error : undefined }
              : { state: "idle" as const },
        )
      : [];
    return {
      templateId: typeof parsed.templateId === "string" ? parsed.templateId : "",
      fileName: typeof parsed.fileName === "string" ? parsed.fileName : "",
      header,
      rows,
      statuses: statuses.length === rows.length ? statuses : rows.map(() => ({ state: "idle" as const })),
    };
  } catch {
    return EMPTY;
  }
}

export function saveBatch(batch: StoredBatch): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(batch));
  } catch {
    /* quota or private browsing - the batch still works for this session */
  }
}

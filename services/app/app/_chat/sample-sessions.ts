import type { components } from "@/lib/api/schema";

type ChatSession = components["schemas"]["SessionResponse"];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

/** Placeholder history until the sidebar reads GET /sessions; delete this file then. */
export const SAMPLE_SESSIONS: ChatSession[] = [
  { id: "s1", title: "LISTEN/NOTIFY payload limits", created_at: ago(2 * HOUR) },
  { id: "s2", title: "SQS visibility timeout heartbeat", created_at: ago(5 * HOUR) },
  { id: "s3", title: "PgBouncer transaction pooling and prepared statements", created_at: ago(DAY + 3 * HOUR) },
  { id: "s4", title: "Idempotent task execution", created_at: ago(3 * DAY) },
  { id: "s5", title: "WebSocket reconnect by task id", created_at: ago(5 * DAY) },
  { id: "s6", title: "LangGraph checkpointing options", created_at: ago(12 * DAY) },
  { id: "s7", title: "Forking workers without inherited connections", created_at: ago(30 * DAY) },
];

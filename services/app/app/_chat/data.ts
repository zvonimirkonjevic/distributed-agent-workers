import "server-only";
import { connection } from "next/server";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type ChatSession = components["schemas"]["SessionResponse"];

/**
 * Read chat sessions from the API, newest first.
 *
 * Returns null when the API is unreachable or errors, so callers can tell a
 * failure apart from an empty history.
 */
export async function listSessions(): Promise<ChatSession[] | null> {
  // Without this, `/` has no request-time inputs and would be prerendered at
  // build time, freezing the history and calling the API during `next build`.
  await connection();
  try {
    const { data } = await api().GET("/sessions");
    return data ?? null;
  } catch {
    return null;
  }
}

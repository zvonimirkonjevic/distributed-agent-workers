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

export type ChatMessage = components["schemas"]["MessageResponse"];

/**
 * Read one chat session, or null when it does not exist or was deleted.
 *
 * Throws when the API is unreachable or errors, so a failure is not mistaken
 * for a missing session.
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const { data, response } = await api().GET("/sessions/{session_id}", {
    params: { path: { session_id: sessionId } },
  });
  if (response.status === 404) {
    return null;
  }
  if (!data) {
    throw new Error(`failed to load session: session_id=${sessionId} status=${response.status}`);
  }
  return data;
}

/**
 * Read a session's user and assistant messages, oldest first.
 *
 * Returns null when the API is unreachable or errors, so callers can tell a
 * failure apart from an empty conversation.
 */
export async function listMessages(sessionId: string): Promise<ChatMessage[] | null> {
  try {
    const { data } = await api().GET("/sessions/{session_id}/messages", {
      params: { path: { session_id: sessionId } },
    });
    return data ?? null;
  } catch {
    return null;
  }
}

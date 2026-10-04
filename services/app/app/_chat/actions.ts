"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";

const TITLE_MAX_LENGTH = 60;

export type CreateSessionResult = { id: string } | { error: string };

function titleFrom(content: string) {
  const firstLine = content.trim().split("\n")[0];
  return firstLine.length > TITLE_MAX_LENGTH ? `${firstLine.slice(0, TITLE_MAX_LENGTH - 1)}…` : firstLine;
}

/**
 * Create a chat session titled after its first message.
 *
 * Only creates the session; the message itself is sent by the browser over
 * the session's WebSocket.
 */
export async function createSession(firstMessage: string): Promise<CreateSessionResult> {
  try {
    const { data } = await api().POST("/sessions", { body: { title: titleFrom(firstMessage) } });
    if (!data) {
      return { error: "Couldn't start a new chat. Try again." };
    }
    return { id: data.id };
  } catch {
    return { error: "Couldn't reach the API. Check that it is running." };
  }
}

export type DeleteSessionResult = { error: string } | undefined;

/**
 * Soft-delete a chat session.
 *
 * Deleting the chat currently on screen sends the user to a new chat, since
 * its page would now 404; otherwise the current page re-renders without it.
 */
export async function deleteSession(sessionId: string, isActive: boolean): Promise<DeleteSessionResult> {
  try {
    const { response } = await api().DELETE("/sessions/{session_id}", {
      params: { path: { session_id: sessionId } },
    });
    // 404 means it is already gone, which is the outcome the user asked for.
    if (!response.ok && response.status !== 404) {
      return { error: "Couldn't delete this chat. Try again." };
    }
  } catch {
    return { error: "Couldn't reach the API. Check that it is running." };
  }

  // Outside the try block: redirect works by throwing.
  if (isActive) {
    redirect("/");
  }
  refresh();
}

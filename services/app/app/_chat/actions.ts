"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";

const TITLE_MAX_LENGTH = 60;

export type SendMessageResult = { error: string } | undefined;

function titleFrom(content: string) {
  const firstLine = content.trim().split("\n")[0];
  return firstLine.length > TITLE_MAX_LENGTH ? `${firstLine.slice(0, TITLE_MAX_LENGTH - 1)}…` : firstLine;
}

/**
 * Send a message and wait for the agent's reply.
 *
 * Without a `sessionId` this is the first message of a new chat: the session
 * is created first, titled after the message, and the user is redirected to
 * it once the reply exists. Otherwise the current page re-renders with the
 * reply in the same roundtrip.
 */
export async function sendMessage(sessionId: string | null, content: string): Promise<SendMessageResult> {
  const text = content.trim();
  if (!text) {
    return { error: "Message is empty." };
  }

  let id = sessionId;
  try {
    if (id === null) {
      const { data } = await api().POST("/sessions", { body: { title: titleFrom(text) } });
      if (!data) {
        return { error: "Couldn't start a new chat. Try again." };
      }
      id = data.id;
    }

    const { error } = await api().POST("/sessions/{session_id}/messages", {
      params: { path: { session_id: id } },
      body: { content: text },
    });
    if (error) {
      return { error: "The agent couldn't reply. Try again." };
    }
  } catch {
    return { error: "Couldn't reach the API. Check that it is running." };
  }

  // Outside any try block: redirect works by throwing.
  if (sessionId === null) {
    redirect(`/sessions/${id}`);
  }
  refresh();
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

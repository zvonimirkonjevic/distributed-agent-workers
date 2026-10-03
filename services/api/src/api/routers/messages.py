"""Endpoints for reading and sending a chat session's messages.

History is read from the session's LangGraph checkpoint, which is the single
source of truth for the conversation.

Temporary: sending runs the agent inside the API process and blocks the
request until the reply is ready. This breaks the "API never executes agent
code" constraint on purpose, to get the app, API, and agent connected first.
When the worker pool lands, `send` becomes "enqueue to SQS, return task_id"
and the reply arrives through LISTEN/NOTIFY instead.
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from loguru import logger

from api.models.messages import MessageCreate, MessageResponse
from core.agent import Agent, get_chat_messages, to_chat_messages
from core.session import get_chat_session
from utils.config import Config

router = APIRouter(prefix="/sessions/{session_id}/messages", tags=["Messages"])

_SESSION_NOT_FOUND = "session not found"


async def _require_session(session_id: str):
    # The CRUD layer is blocking; keep it off the event loop.
    if await run_in_threadpool(get_chat_session, session_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _SESSION_NOT_FOUND)


@router.get("", response_model=list[MessageResponse], summary="List a session's messages")
async def list_all(session_id: str):
    """Return the session's user and assistant messages, oldest first.

    Responds with 404 if the session does not exist or has been deleted.
    """
    await _require_session(session_id)
    return await get_chat_messages(session_id)


@router.post("", response_model=MessageResponse, summary="Send a message and wait for the reply")
async def send(session_id: str, body: MessageCreate):
    """Run one agent turn on the message and return the assistant's reply.

    Blocks until the agent finishes. Responds with 404 if the session does not
    exist or has been deleted, and 502 if the agent ends without a text reply.
    """
    await _require_session(session_id)

    state = await Agent(session_id, Config.model_id).ainvoke(body.content)

    reply = to_chat_messages(state["messages"])[-1]
    if reply["role"] != "assistant":
        logger.error(f"agent turn ended without assistant text: session_id={session_id}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "agent returned no reply")
    return reply

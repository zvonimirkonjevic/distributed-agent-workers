"""Endpoints for reading and sending a chat session's messages.

History is read from the session's LangGraph checkpoint, which is the single
source of truth for the conversation.

Temporary: sending runs the agent inside the API process and blocks the
request until the reply is ready. This breaks the "API never executes agent
code" constraint on purpose, to get the app, API, and agent connected first.
When the worker pool lands, `send` becomes "enqueue to SQS, return task_id"
and the reply arrives through LISTEN/NOTIFY instead.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.concurrency import run_in_threadpool

from loguru import logger

from api.models.messages import MessageResponse
from core.agent import Agent, to_chat_messages
from core.session import get_chat_session


router = APIRouter(prefix="/messages", tags=["messages"])

@router.get("/sessions/{session_id}", response_model=list[MessageResponse], summary="List a session's messages")
async def read(session_id: str):
    """Return the session's user and assistant messages, oldest first.

    Responds with 404 if the session does not exist or has been deleted.
    """
    # The CRUD layer is blocking; keep it off the event loop.
    if await run_in_threadpool(get_chat_session, session_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")

    messages = await Agent(session_id, "openai:gpt-5.6-luna").aget_messages()
    return to_chat_messages(messages)


@router.websocket("/ws/sessions/{session_id}")
async def send(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if await run_in_threadpool(get_chat_session, session_id) is None:
          await websocket.close(code=4404, reason="session not found")
          return

    agent = Agent(session_id, model_id="openai:gpt-5.6-luna")
    try:
        while True:
            content = await websocket.receive_text()
            response = await agent.ainvoke(content)
            reply = to_chat_messages(response["messages"])[-1]
            if reply["role"] != "assistant":
                logger.error(f"agent turn ended without assistant text: session_id={session_id}")
                await websocket.send_json({"type": "error", "detail": "agent returned no reply"})
                continue
            await websocket.send_json({"type": "reply", "message": reply})

    except WebSocketDisconnect:
        logger.info(f"websocket closed: session_id={session_id}")
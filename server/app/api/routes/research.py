from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
import uuid
import asyncio
import json
from typing import Dict
from fastapi.responses import StreamingResponse

from app.database.client import get_session
from app.database.models import ResearchSession, ExpandedQuery, SearchResult, Source, Debate, DebateMessage, ResearchAnswer
from app.research.workflow import research_graph

router = APIRouter()

class ResearchRequest(BaseModel):
    query: str
    max_debate_rounds: int = 2

class ResearchResponse(BaseModel):
    session_id: uuid.UUID
    status: str

# In-memory queues for SSE
session_queues: Dict[uuid.UUID, asyncio.Queue] = {}

async def run_research_background(session_id: uuid.UUID, query: str, max_debate_rounds: int):
    try:
        # Initialize the state
        state = {
            "session_id": session_id,
            "original_query": query,
            "expanded_queries": [],
            "search_results": [],
            "sources": [],
            "deduplicated_context": [],
            "debate": [],
            "debate_rounds": 0,
            "max_debate_rounds": max_debate_rounds,
            "final_answer": None
        }
        
        # Execute the graph and stream events
        final_state = state.copy()
        
        async for event in research_graph.astream(state):
            for node_name, state_update in event.items():
                final_state.update(state_update)
                # If there's an active SSE client, send the event
                if session_id in session_queues:
                    # Filter heavy payloads for the stream if needed, or send raw
                    safe_update = {k: v for k, v in state_update.items() if k not in ["deduplicated_context", "sources"]}
                    await session_queues[session_id].put({"type": "node_update", "node": node_name, "data": safe_update})

        if session_id in session_queues:
            await session_queues[session_id].put({"type": "completed"})
        
        # Save to database
        db_gen = get_session()
        db = next(db_gen)
        
        db_session = db.get(ResearchSession, session_id)
        if db_session:
            db_session.status = "completed"
            
            # Save expanded queries
            for q in final_state.get("expanded_queries", []):
                db.add(ExpandedQuery(research_session_id=session_id, query=q))
                
            # Save sources
            for s in final_state.get("deduplicated_context", []):
                db.add(Source(research_session_id=session_id, url=s.get("url"), title=s.get("title"), content=s.get("content"), content_hash=s.get("content_hash")))
                
            # Save debate
            if final_state.get("debate"):
                debate = Debate(research_session_id=session_id, status="completed", round_count=final_state.get("debate_rounds", 0))
                db.add(debate)
                db.flush() # get debate id
                for msg in final_state.get("debate", []):
                    db.add(DebateMessage(debate_id=debate.id, agent=msg["agent"], round=msg["round"], message=msg["message"]))
                    
            # Save final answer
            if final_state.get("final_answer"):
                db.add(ResearchAnswer(research_session_id=session_id, answer=final_state.get("final_answer")))
                
            db.commit()

    except Exception as e:
        print(f"Research failed: {e}")
        db_gen = get_session()
        db = next(db_gen)
        db_session = db.get(ResearchSession, session_id)
        if db_session:
            db_session.status = "failed"
            db_session.error = str(e)
            db.commit()

from app.api.auth import get_current_user
from app.database.models import User

@router.post("/", response_model=ResearchResponse)
async def start_research(
    request: ResearchRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_session = ResearchSession(
        user_id=current_user.id,
        original_query=request.query, 
        status="pending"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Create the SSE queue NOW, before the background task starts,
    # so no events are lost due to a race condition.
    session_queues[db_session.id] = asyncio.Queue()
    
    background_tasks.add_task(run_research_background, db_session.id, request.query, request.max_debate_rounds)
    
    return ResearchResponse(session_id=db_session.id, status=db_session.status)

@router.get("/history")
async def get_research_history(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    sessions = db.exec(
        select(ResearchSession)
        .where(ResearchSession.user_id == current_user.id)
        .order_by(ResearchSession.created_at.desc())
    ).all()
    return sessions

@router.get("/{session_id}")
async def get_research_session(
    session_id: uuid.UUID, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    session = db.get(ResearchSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/{session_id}/stream")
async def stream_research(
    session_id: uuid.UUID, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    session = db.get(ResearchSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status != "pending":
        # If already completed or failed, just return a completed event
        async def mock_stream():
            yield f"data: {json.dumps({'type': session.status})}\n\n"
        return StreamingResponse(mock_stream(), media_type="text/event-stream")

    # Queue was already created in POST; if missing for some reason, create it now
    if session_id not in session_queues:
        session_queues[session_id] = asyncio.Queue()

    async def event_generator():
        try:
            while True:
                # Wait for an event
                event = await asyncio.wait_for(session_queues[session_id].get(), timeout=120.0)
                yield f"data: {json.dumps(event)}\n\n"
                
                if event["type"] in ["completed", "error"]:
                    break
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Stream timeout'})}\n\n"
        finally:
            if session_id in session_queues:
                del session_queues[session_id]

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/{session_id}/sources")
async def get_sources(
    session_id: uuid.UUID, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    session = db.get(ResearchSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    sources = db.exec(select(Source).where(Source.research_session_id == session_id)).all()
    return sources

@router.get("/{session_id}/debate")
async def get_debate(
    session_id: uuid.UUID, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    session = db.get(ResearchSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    debate = db.exec(select(Debate).where(Debate.research_session_id == session_id)).first()
    if not debate:
        return []
    messages = db.exec(select(DebateMessage).where(DebateMessage.debate_id == debate.id).order_by(DebateMessage.round)).all()
    return messages

@router.get("/{session_id}/answer")
async def get_answer(
    session_id: uuid.UUID, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    session = db.get(ResearchSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    answer = db.exec(select(ResearchAnswer).where(ResearchAnswer.research_session_id == session_id)).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found yet")
    return answer

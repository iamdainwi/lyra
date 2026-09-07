from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime
import uuid

class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    sessions: List["ResearchSession"] = Relationship(back_populates="user")

class ResearchSession(SQLModel, table=True):
    __tablename__ = "research_sessions" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    original_query: str
    status: str = Field(default="pending")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    user: Optional[User] = Relationship(back_populates="sessions")
    expanded_queries: List["ExpandedQuery"] = Relationship(back_populates="session")
    search_results: List["SearchResult"] = Relationship(back_populates="session")
    sources: List["Source"] = Relationship(back_populates="session")
    debates: List["Debate"] = Relationship(back_populates="session")
    final_answer: Optional["ResearchAnswer"] = Relationship(back_populates="session")
    chat_messages: List["ChatMessage"] = Relationship(back_populates="session")

class ExpandedQuery(SQLModel, table=True):
    __tablename__ = "expanded_queries" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    research_session_id: uuid.UUID = Field(foreign_key="research_sessions.id")
    query: str
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    session: ResearchSession = Relationship(back_populates="expanded_queries")
    search_results: List["SearchResult"] = Relationship(back_populates="expanded_query")

class SearchResult(SQLModel, table=True):
    __tablename__ = "search_results" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    research_session_id: uuid.UUID = Field(foreign_key="research_sessions.id")
    expanded_query_id: Optional[uuid.UUID] = Field(default=None, foreign_key="expanded_queries.id")
    title: str
    url: str
    snippet: Optional[str] = None
    domain: Optional[str] = None
    published_at: Optional[str] = None
    rank: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    session: ResearchSession = Relationship(back_populates="search_results")
    expanded_query: Optional[ExpandedQuery] = Relationship(back_populates="search_results")

class Source(SQLModel, table=True):
    __tablename__ = "sources" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    research_session_id: uuid.UUID = Field(foreign_key="research_sessions.id")
    url: str
    canonical_url: Optional[str] = None
    title: Optional[str] = None
    domain: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
    content: Optional[str] = None
    content_hash: Optional[str] = None
    word_count: Optional[int] = None
    source_type: str = Field(default="unknown")

    session: ResearchSession = Relationship(back_populates="sources")

class Debate(SQLModel, table=True):
    __tablename__ = "debates" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    research_session_id: uuid.UUID = Field(foreign_key="research_sessions.id")
    status: str = Field(default="pending")
    round_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    session: ResearchSession = Relationship(back_populates="debates")
    messages: List["DebateMessage"] = Relationship(back_populates="debate")

class DebateMessage(SQLModel, table=True):
    __tablename__ = "debate_messages" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    debate_id: uuid.UUID = Field(foreign_key="debates.id")
    agent: str
    round: int
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    debate: Debate = Relationship(back_populates="messages")

class ResearchAnswer(SQLModel, table=True):
    __tablename__ = "research_answers" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    research_session_id: uuid.UUID = Field(foreign_key="research_sessions.id", unique=True)
    answer: str
    confidence: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    summary: Optional[str] = None
    limitations: Optional[str] = None
    recommendations: Optional[str] = None

    session: ResearchSession = Relationship(back_populates="final_answer")

class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    research_session_id: uuid.UUID = Field(foreign_key="research_sessions.id")
    role: str # 'user' or 'assistant'
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    session: ResearchSession = Relationship(back_populates="chat_messages")

from typing import TypedDict, List, Dict, Any, Optional
import uuid

class ResearchState(TypedDict):
    session_id: uuid.UUID
    original_query: str
    expanded_queries: List[str]
    search_results: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    deduplicated_context: List[Dict[str, Any]]
    researcher_position: Optional[str]
    critic_position: Optional[str]
    debate: List[Dict[str, Any]]
    debate_rounds: int
    max_debate_rounds: int
    final_answer: Optional[str]
    error: Optional[str]

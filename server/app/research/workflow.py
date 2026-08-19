from langgraph.graph import StateGraph, END
from app.research.state import ResearchState
from app.research.nodes import expand_query_node, search_node, extract_node, deduplicate_node
from app.research.agents import researcher_node, critic_node, synthesizer_node

def should_continue_debate(state: ResearchState) -> str:
    """Conditional edge logic to determine if debate continues."""
    rounds = state.get("debate_rounds", 0)
    max_rounds = state.get("max_debate_rounds", 2)
    if rounds >= max_rounds:
        return "synthesize"
    return "researcher"

def create_research_graph():
    workflow = StateGraph(ResearchState)
    
    # Add nodes
    workflow.add_node("expand_query", expand_query_node)
    workflow.add_node("search", search_node)
    workflow.add_node("extract", extract_node)
    workflow.add_node("deduplicate", deduplicate_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("synthesize", synthesizer_node)
    
    # Set entry point
    workflow.set_entry_point("expand_query")
    
    # Edges
    workflow.add_edge("expand_query", "search")
    workflow.add_edge("search", "extract")
    workflow.add_edge("extract", "deduplicate")
    workflow.add_edge("deduplicate", "researcher")
    workflow.add_edge("researcher", "critic")
    
    # Conditional edge from critic
    workflow.add_conditional_edges(
        "critic",
        should_continue_debate,
        {
            "researcher": "researcher",
            "synthesize": "synthesize"
        }
    )
    
    workflow.add_edge("synthesize", END)
    
    return workflow.compile()

research_graph = create_research_graph()

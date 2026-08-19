import json
import asyncio
from app.research.state import ResearchState
from app.core.llm import get_llm, get_llm_json
from app.tools.tool import web_search
from app.tools.extractor import extract_content as extract_html
from app.tools.deduplicator import deduplicate_sources
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

async def expand_query_node(state: ResearchState) -> ResearchState:
    original_query = state["original_query"]
    llm = get_llm_json()
    
    prompt = f"""You are a research query expansion expert. 
Given the user query: "{original_query}"
Generate 3 to 5 distinct search queries to thoroughly investigate the topic from different dimensions.
Output as a JSON object with a single key "queries" containing a list of strings."""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        content = json.loads(response.content)
        queries = content.get("queries", [original_query])
    except Exception:
        queries = [original_query]
        
    state["expanded_queries"] = queries
    return state

async def search_node(state: ResearchState) -> ResearchState:
    queries = state["expanded_queries"]
    all_results = []
    for query in queries:
        results = web_search(query, max_results=3)
        for r in results:
            all_results.append({"query": query, "title": r.title, "url": r.url, "snippet": r.snippet})
            
    state["search_results"] = all_results
    return state

async def extract_node(state: ResearchState) -> ResearchState:
    search_results = state["search_results"]
    sources = []
    
    # We will fetch URLs concurrently to speed up
    async def fetch_and_store(res):
        content = await extract_html(res["url"])
        if content:
            sources.append({
                "title": res["title"],
                "url": res["url"],
                "content": content
            })
            
    tasks = [fetch_and_store(res) for res in search_results]
    await asyncio.gather(*tasks)
    
    state["sources"] = sources
    return state

async def deduplicate_node(state: ResearchState) -> ResearchState:
    sources = state["sources"]
    unique = deduplicate_sources(sources)
    state["deduplicated_context"] = unique
    return state

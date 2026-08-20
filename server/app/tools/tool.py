from duckduckgo_search import DDGS
from pydantic import BaseModel, Field
from typing import List, Dict, Any

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str

def web_search(query: str, max_results: int = 10) -> List[SearchResult]:
    """
    Search the web for information and return the results.
    """
    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append(SearchResult(
                    title=r.get("title", ""),
                    url=r.get("href", ""),
                    snippet=r.get("body", "")
                ))
    except Exception as e:
        print(f"Error during web search: {e}")
    return results
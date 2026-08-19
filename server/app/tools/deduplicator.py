import hashlib
from typing import List, Dict, Any

def hash_content(text: str) -> str:
    """Generate SHA256 hash of text."""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def deduplicate_sources(sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Remove duplicate sources based on URL and content hash.
    Expects sources to be a list of dictionaries with 'url' and 'content' keys.
    """
    seen_urls = set()
    seen_hashes = set()
    unique_sources = []
    
    for source in sources:
        url = source.get("url")
        content = source.get("content", "")
        
        if not url or not content:
            continue
            
        if url in seen_urls:
            continue
            
        content_hash = hash_content(content)
        if content_hash in seen_hashes:
            continue
            
        seen_urls.add(url)
        seen_hashes.add(content_hash)
        
        source["content_hash"] = content_hash
        unique_sources.append(source)
        
    return unique_sources

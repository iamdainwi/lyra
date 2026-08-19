import httpx
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

async def extract_content(url: str, timeout: int = 10) -> str:
    """
    Fetch the webpage and extract clean text.
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            
            # Remove scripts, styles, navs, footers
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()
                
            text = soup.get_text(separator="\n")
            
            # Normalize whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = "\n".join(chunk for chunk in chunks if chunk)
            
            return text
            
    except Exception as e:
        logger.error(f"Failed to extract content from {url}: {e}")
        return ""

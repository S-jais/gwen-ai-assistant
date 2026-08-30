import logging
from typing import Any, Dict, List
import httpx
from bs4 import BeautifulSoup
from app.tools.base import BaseTool, ToolDefinition, ToolParameter

logger = logging.getLogger(__name__)


class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Search the public web for real-time information, resources, and articles using free search providers."
    required_permissions = ["network_access"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="query",
                    type="string",
                    description="The search query or keywords to look up on the web.",
                    required=True,
                ),
                ToolParameter(
                    name="max_results",
                    type="integer",
                    description="Maximum number of search results to return (1-10).",
                    required=False,
                    default=5,
                ),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(self, query: str, max_results: int = 5, **kwargs: Any) -> Dict[str, Any]:
        results: List[Dict[str, str]] = []
        # Attempt 1: duckduckgo_search library
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                ddg_gen = ddgs.text(query, max_results=max_results)
                for r in ddg_gen:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", "") or r.get("link", ""),
                        "snippet": r.get("body", "") or r.get("snippet", ""),
                    })
        except Exception as e1:
            logger.warning(f"DDGS library search failed: {e1}, attempting HTTP fallback...")

        # Attempt 2: Free DuckDuckGo HTML scraper fallback
        if not results:
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                async with httpx.AsyncClient(timeout=10.0, headers=headers, follow_redirects=True) as client:
                    resp = await client.get(
                        "https://html.duckduckgo.com/html/",
                        params={"q": query}
                    )
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        links = soup.find_all("a", class_="result__snippet")
                        titles = soup.find_all("a", class_="result__url")
                        for i in range(min(len(links), max_results)):
                            results.append({
                                "title": titles[i].get_text(strip=True) if i < len(titles) else "Search Result",
                                "url": titles[i].get("href", "") if i < len(titles) else "",
                                "snippet": links[i].get_text(strip=True),
                            })
            except Exception as e2:
                logger.error(f"Fallback search also failed: {e2}")

        # Attempt 3: Wikipedia API fallback for knowledge terms
        if not results:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        "https://en.wikipedia.org/w/api.php",
                        params={
                            "action": "opensearch",
                            "search": query,
                            "limit": max_results,
                            "namespace": 0,
                            "format": "json",
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        if len(data) >= 4:
                            titles = data[1]
                            snippets = data[2]
                            urls = data[3]
                            for t, s, u in zip(titles, snippets, urls):
                                results.append({"title": t, "url": u, "snippet": s})
            except Exception as e3:
                logger.error(f"Wikipedia fallback failed: {e3}")

        return {
            "query": query,
            "count": len(results),
            "results": results,
            "success": True,
        }


class FetchWebpageTool(BaseTool):
    name = "fetch_webpage"
    description = "Fetch and extract readable content from a given web URL."
    required_permissions = ["network_access"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="url",
                    type="string",
                    description="The full HTTP/HTTPS URL of the web page to fetch.",
                    required=True,
                ),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(self, url: str, **kwargs: Any) -> Dict[str, Any]:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return {"url": url, "success": False, "error": f"HTTP status {res.status_code}"}

                # Try trafilatura first for clean article extraction
                extracted_text = ""
                try:
                    import trafilatura
                    extracted_text = trafilatura.extract(res.text) or ""
                except Exception:
                    pass

                # Fallback to BeautifulSoup
                if not extracted_text:
                    soup = BeautifulSoup(res.text, "html.parser")
                    for s in soup(["script", "style", "nav", "footer", "header"]):
                        s.extract()
                    extracted_text = soup.get_text(separator="\n", strip=True)

                # Truncate to reasonable context window (~3000 words)
                trimmed_text = extracted_text[:12000] if extracted_text else "No text extracted."

                return {
                    "url": url,
                    "title": (soup.title.string if 'soup' in locals() and soup.title else url),
                    "content": trimmed_text,
                    "success": True,
                }
        except Exception as e:
            return {"url": url, "success": False, "error": str(e)}

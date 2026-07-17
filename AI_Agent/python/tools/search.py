"""Search and knowledge tool for threat intelligence"""

from typing import Dict, Any
from python.helpers.tool import Tool
import httpx


class SearchTool(Tool):
    """Search the web for threat intelligence and security information"""
    
    def __init__(self, agent):
        super().__init__(
            agent=agent,
            name="search",
            description="Search for security information, CVEs, exploits, and threat intelligence"
        )
        
    async def execute(
        self,
        query: str,
        max_results: int = 5,
    ) -> Dict[str, Any]:
        """
        Search for information
        
        Args:
            query: Search query (e.g., "CVE-2024-1234", "SQL injection techniques")
            max_results: Maximum number of results
        """
        
        self.log_tool_use({"query": query})
        
        if not query.strip():
            return {"success": False, "error": "No query provided"}
        
        try:
            # Simple DuckDuckGo search (can be replaced with SearXNG or other)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.duckduckgo.com/",
                    params={
                        "q": query,
                        "format": "json",
                        "no_redirect": 1,
                    },
                    timeout=10.0
                )
                
                data = response.json()
                
                results = []
                
                # Abstract answer
                if data.get("AbstractText"):
                    results.append({
                        "title": "Abstract",
                        "snippet": data["AbstractText"],
                        "url": data.get("AbstractURL", ""),
                    })
                
                # Related topics
                for topic in data.get("RelatedTopics", [])[:max_results]:
                    if isinstance(topic, dict) and "Text" in topic:
                        results.append({
                            "title": topic.get("Text", "")[:100],
                            "snippet": topic.get("Text", ""),
                            "url": topic.get("FirstURL", ""),
                        })
                
                result = {
                    "success": True,
                    "query": query,
                    "count": len(results),
                    "results": results
                }
                
                if self.logger:
                    self.logger.success(
                        heading="Search Results",
                        content=f"Found {len(results)} results for: {query}"
                    )
                
                self.log_tool_result(result)
                return result
                
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "results": []
            }
            self.log_tool_result(error_result)
            return error_result

"""Memory load/recall tool"""

from typing import Dict, Any, Optional
from python.helpers.tool import Tool


class MemoryLoadTool(Tool):
    """Load/recall information from long-term memory"""
    
    def __init__(self, agent):
        super().__init__(
            agent=agent,
            name="memory_load",
            description="Recall information from long-term memory using semantic search"
        )
        self.memory = agent.memory
        
    async def execute(
        self,
        query: str,
        max_results: int = 5,
        category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Recall information from memory
        
        Args:
            query: What to search for (e.g., "SQL injection exploits", "credentials for target.com")
            max_results: Maximum number of results to return
            category: Optional filter by category
        """
        
        self.log_tool_use({"query": query, "max_results": max_results})
        
        if not query.strip():
            return {"success": False, "error": "No query provided"}
        if self.memory is None:
            return {"success": False, "error": "Memory is disabled. Enable it in configuration (MEMORY_ENABLED=true).", "memories": []}
        
        try:
            # Prepare filter
            filter_metadata = None
            if category:
                filter_metadata = {"category": category}
            
            # Recall from memory
            memories = await self.memory.recall(
                query=query,
                max_results=max_results,
                filter_metadata=filter_metadata,
            )
            
            result = {
                "success": True,
                "count": len(memories),
                "memories": memories
            }
            
            if self.logger:
                self.logger.success(
                    heading="Memory Recalled",
                    content=f"Found {len(memories)} relevant memories for query: {query}"
                )
                for i, mem in enumerate(memories[:3]):  # Show first 3
                    self.logger.info(
                        heading=f"Memory {i+1} (ID: {mem['id']})",
                        content=mem['content'][:300]
                    )
            
            self.log_tool_result(result)
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "memories": []
            }
            self.log_tool_result(error_result)
            return error_result

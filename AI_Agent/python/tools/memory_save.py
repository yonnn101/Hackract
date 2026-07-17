"""Memory save tool"""

from typing import Dict, Any, Optional
from python.helpers.tool import Tool


class MemorySaveTool(Tool):
    """Save information to long-term memory"""
    
    def __init__(self, agent):
        super().__init__(
            agent=agent,
            name="memory_save",
            description="Save important information to long-term memory (exploits, vulnerabilities, credentials, etc.)"
        )
        self.memory = agent.memory
        
    async def execute(
        self,
        content: str,
        category: str = "general",
        tags: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Save information to memory
        
        Args:
            content: The information to save
            category: Category (exploit, vulnerability, credential, technique, finding, etc.)
            tags: Optional list of tags for better organization
        """
        
        self.log_tool_use({"category": category, "content": content[:100]})
        
        if not content.strip():
            return {"success": False, "error": "No content provided"}
        if self.memory is None:
            return {"success": False, "error": "Memory is disabled. Enable it in configuration (MEMORY_ENABLED=true)."}
        
        try:
            # Prepare metadata
            # ChromaDB doesn't support lists in metadata, so we join tags into a string
            tags_str = ", ".join(tags) if tags else ""
            metadata = {
                "category": category,
                "tags": tags_str,
            }
            
            # Save to memory
            memory_id = await self.memory.save(
                content=content,
                metadata=metadata,
            )
            
            result = {
                "success": True,
                "memory_id": memory_id,
                "message": f"Saved {category} to memory with ID: {memory_id}"
            }
            
            if self.logger:
                self.logger.success(
                    heading="Memory Saved",
                    content=f"Category: {category}\nID: {memory_id}\nContent: {content[:200]}"
                )
            
            self.log_tool_result(result)
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e)
            }
            self.log_tool_result(error_result)
            return error_result

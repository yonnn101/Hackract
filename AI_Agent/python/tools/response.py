"""Response tool for communicating with the user"""

from typing import Dict, Any
from python.helpers.tool import Tool


class ResponseTool(Tool):
    """Send response to the user"""
    
    def __init__(self, agent):
        super().__init__(
            agent=agent,
            name="response",
            description="Send a response or final answer to the user"
        )
        
    async def execute(
        self,
        message: str,
        ) -> Dict[str, Any]:
        """
        Send response to user
        
        Args:
            message: The message to send to the user
        """
        
        self.log_tool_use({"message": message[:100]})
        
        if not message.strip():
            return {"success": False, "error": "No message provided"}
        
        try:
            # Log the response
            if self.logger:
                self.logger.agent(
                    heading="Agent Response",
                    content=message
                )
            
            result = {
                "success": True,
                "message": message
            }
            
            self.log_tool_result(result)
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e)
            }
            return error_result

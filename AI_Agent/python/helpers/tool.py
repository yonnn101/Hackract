"""Base class for agent tools"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from python.helpers.log import Logger


class Tool(ABC):
    """Base class for all agent tools"""
    
    def __init__(self, agent: Any, name: str, description: str):
        self.agent = agent
        self.name = name
        self.description = description
        self.logger: Logger = agent.logger if hasattr(agent, 'logger') else None
        
    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool with given parameters"""
        pass
    
    def log_tool_use(self, params: Dict[str, Any]):
        """Log tool usage"""
        if self.logger:
            self.logger.tool(
                heading=f"Using tool: {self.name}",
                content=f"Parameters: {params}"
            )
    
    def log_tool_result(self, result: Any):
        """Log tool result"""
        if self.logger:
            self.logger.result(
                heading=f"Tool result: {self.name}",
                content=str(result)[:500]  # Limit output
            )

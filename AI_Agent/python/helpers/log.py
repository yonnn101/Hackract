"""Logging utilities for HackrAct AI Agent"""

from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
import json
from colorama import Fore, Back, Style, init

# Initialize colorama
init(autoreset=True)


class LogType(Enum):
    """Types of log messages"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"
    SYSTEM = "system"
    AGENT = "agent"
    TOOL = "tool"
    USER = "user"
    CODE = "code"
    RESULT = "result"


class Logger:
    """Simple logger for agent output"""
    
    def __init__(self, log_dir: str = "./logs"):
        self.log_dir = log_dir
        self.logs = []
        
    def log(
        self,
        log_type: LogType,
        heading: Optional[str] = None,
        content: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        print_console: bool = True,
    ):
        """Log a message"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "type": log_type.value,
            "heading": heading,
            "content": content,
            "data": data,
        }
        self.logs.append(log_entry)
        
        # Print to console with colors
        if print_console:
            self._print_colored(log_type, heading, content)
        
    def _print_colored(self, log_type: LogType, heading: Optional[str], content: Optional[str]):
        """Print colored output to console"""
        
        # Color mapping
        colors = {
            LogType.INFO: Fore.CYAN,
            LogType.WARNING: Fore.YELLOW,
            LogType.ERROR: Fore.RED,
            LogType.SUCCESS: Fore.GREEN,
            LogType.SYSTEM: Fore.MAGENTA,
            LogType.AGENT: Fore.BLUE,
            LogType.TOOL: Fore.LIGHTYELLOW_EX,
            LogType.USER: Fore.WHITE,
            LogType.CODE: Fore.LIGHTBLACK_EX,
            LogType.RESULT: Fore.LIGHTGREEN_EX,
        }
        
        color = colors.get(log_type, Fore.WHITE)
        
        if heading:
            print(f"{color}{Style.BRIGHT}[{log_type.value.upper()}] {heading}{Style.RESET_ALL}")
        if content:
            print(f"{color}{content}{Style.RESET_ALL}")
        print()  # Empty line for spacing
        
    def info(self, heading: str = "", content: str = ""):
        """Log info message"""
        self.log(LogType.INFO, heading, content)
        
    def warning(self, heading: str = "", content: str = ""):
        """Log warning message"""
        self.log(LogType.WARNING, heading, content)
        
    def error(self, heading: str = "", content: str = ""):
        """Log error message"""
        self.log(LogType.ERROR, heading, content)
        
    def success(self, heading: str = "", content: str = ""):
        """Log success message"""
        self.log(LogType.SUCCESS, heading, content)
        
    def agent(self, heading: str = "", content: str = "", print_console: bool = True):
        """Log agent message"""
        self.log(LogType.AGENT, heading, content, print_console=print_console)
        
    def tool(self, heading: str = "", content: str = "", print_console: bool = True):
        """Log tool usage"""
        self.log(LogType.TOOL, heading, content, print_console=print_console)
        
    def code(self, heading: str = "", content: str = ""):
        """Log code execution"""
        self.log(LogType.CODE, heading, content)
        
    def result(self, heading: str = "", content: str = ""):
        """Log results"""
        self.log(LogType.RESULT, heading, content)
        
    def save_to_file(self, filename: str):
        """Save logs to JSON file"""
        import os
        os.makedirs(self.log_dir, exist_ok=True)
        filepath = os.path.join(self.log_dir, filename)
        with open(filepath, 'w') as f:
            json.dump(self.logs, f, indent=2)

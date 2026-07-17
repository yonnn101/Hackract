import os
import importlib.util
import inspect
import asyncio
from typing import List, Dict, Any, Optional
from python.helpers.log import Logger

class Extension:
    """Base class for all extensions"""
    
    def __init__(self, agent):
        self.agent = agent

    async def execute(self, **kwargs):
        """Execute the extension logic"""
        pass

class ExtensionManager:
    """Manages loading and execution of extensions"""
    
    def __init__(self, agent):
        self.agent = agent
        self.extensions: Dict[str, List[Extension]] = {}
        self.logger = Logger(log_dir=agent.config.log_dir)

    def load_extensions(self):
        """Load all extensions from the extensions directory"""
        base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "python", "extensions")
        
        if not os.path.exists(base_dir):
            self.logger.info(heading="Extensions", content="No extensions directory found")
            return

        # Iterate through extension points (subdirectories)
        for extension_point in os.listdir(base_dir):
            point_dir = os.path.join(base_dir, extension_point)
            if not os.path.isdir(point_dir):
                continue
                
            self.extensions[extension_point] = []
            
            # Load python files in the extension point directory
            files = sorted([f for f in os.listdir(point_dir) if f.endswith(".py") and not f.startswith("__")])
            
            for filename in files:
                try:
                    module_name = f"python.extensions.{extension_point}.{filename[:-3]}"
                    file_path = os.path.join(point_dir, filename)
                    
                    spec = importlib.util.spec_from_file_location(module_name, file_path)
                    if spec and spec.loader:
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)
                        
                        # Find Extension subclasses
                        for name, obj in inspect.getmembers(module):
                            if (inspect.isclass(obj) and 
                                issubclass(obj, Extension) and 
                                obj is not Extension):
                                
                                extension_instance = obj(self.agent)
                                self.extensions[extension_point].append(extension_instance)
                                self.logger.info(
                                    heading="Extension Loaded", 
                                    content=f"Loaded {name} for {extension_point}"
                                )
                except Exception as e:
                    self.logger.error(
                        heading="Extension Load Error",
                        content=f"Failed to load {filename}: {str(e)}"
                    )

    async def execute(self, extension_point: str, **kwargs):
        """Execute all extensions for a given point"""
        if extension_point in self.extensions:
            for extension in self.extensions[extension_point]:
                try:
                    await extension.execute(**kwargs)
                except Exception as e:
                    self.logger.error(
                        heading="Extension Execution Error",
                        content=f"Error in {extension.__class__.__name__}: {str(e)}"
                    )

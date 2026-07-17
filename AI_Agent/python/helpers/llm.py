"""LLM interface using LiteLLM"""

from typing import List, Dict, Any, Optional, AsyncIterator
import litellm
from litellm import acompletion
import os
import json


class LLM:
    """Wrapper for LiteLLM to interact with various LLM providers"""
    
    def __init__(
        self,
        model: str = "anthropic/claude-3.5-sonnet",
        api_key: str = "",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        max_context_tokens: int = 128000,
        provider: str = "openrouter",
        #CHANGE THIS PORT NUMBER TO MY OLLAM PORT NUMBER
        ollama_base_url: str = "http://localhost:11434",
        custom_api_base: str = "",
    ):
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.max_context_tokens = max_context_tokens
        self.provider = provider
        self.ollama_base_url = ollama_base_url
        self.custom_api_base = custom_api_base
        
        # Configure provider-specific settings
        if provider == "ollama":
            # Map localhost to host.docker.internal if running inside a Docker container
            if ("localhost" in self.ollama_base_url or "127.0.0.1" in self.ollama_base_url) and os.path.exists('/.dockerenv'):
                self.ollama_base_url = self.ollama_base_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")
                
            # For Ollama, set the base URL
            os.environ["OLLAMA_API_BASE"] = self.ollama_base_url
            litellm.api_base = self.ollama_base_url
            # LiteLLM expects 'ollama/' prefix for Ollama models
            if not self.model.startswith("ollama/"):
                self.model = f"ollama/{self.model}"
        elif provider == "openrouter":
            if api_key:
                os.environ["OPENROUTER_API_KEY"] = api_key
        elif provider == "openai":
            if api_key:
                os.environ["OPENAI_API_KEY"] = api_key
        elif provider == "anthropic":
            if api_key:
                os.environ["ANTHROPIC_API_KEY"] = api_key
        elif provider == "gemini":
            if api_key:
                os.environ["GEMINI_API_KEY"] = api_key
            # LiteLLM expects 'gemini/' prefix for Gemini models
            if not self.model.startswith("gemini/"):
                self.model = f"gemini/{self.model}"
        elif provider == "deepseek":
            if api_key:
                os.environ["DEEPSEEK_API_KEY"] = api_key
            # Ensure model starts with deepseek/
            if not self.model.startswith("deepseek/"):
                self.model = f"deepseek/{self.model}"
        elif provider == "github":
            # GitHub Models (via Azure AI)
            # Uses OpenAI client but with a specific base URL
            litellm.api_base = "https://models.inference.ai.azure.com"
            if api_key:
                os.environ["OPENAI_API_KEY"] = api_key
            
            # Ensure model has openai/ prefix for litellm to use the right client
            # GitHub models are accessed via OpenAI client in litellm
            if not self.model.startswith("openai/"):
                self.model = f"openai/{self.model}"
        elif provider == "nvidia_nim":
            if api_key:
                os.environ["NVIDIA_API_KEY"] = api_key
                os.environ["NVIDIA_NIM_API_KEY"] = api_key

            if not self.model.startswith("nvidia_nim/"):
                self.model = f"nvidia_nim/{self.model}"
        elif provider == "groq":
            if api_key:
                os.environ["GROQ_API_KEY"] = api_key
            if not self.model.startswith("groq/"):
                self.model = f"groq/{self.model}"
        elif provider == "mistral":
            if api_key:
                os.environ["MISTRAL_API_KEY"] = api_key
            if not self.model.startswith("mistral/"):
                self.model = f"mistral/{self.model}"
        elif provider == "custom":
            # For custom endpoints
            if custom_api_base:
                litellm.api_base = custom_api_base
            if api_key:
                os.environ["CUSTOM_API_KEY"] = api_key
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
    ) -> str | AsyncIterator[str]:
        """Send chat completion request"""
        
        temp = temperature if temperature is not None else self.temperature
        max_tok = max_tokens if max_tokens is not None else self.max_tokens
        if self.provider == "github":
            # GitHub Models total request budget is tight; keep completion small
            max_tok = min(max_tok, 2048)
        
        try:
            if stream:
                return self._stream_chat(messages, temp, max_tok)
            else:
                response = await acompletion(
                    model=self.model,
                    messages=messages,
                    temperature=temp,
                    max_tokens=max_tok,
                )
                return response.choices[0].message.content
        except Exception as e:
            print(f"LLM Error: {e}")
            # Return the raw error, let the caller format it
            raise e
    
    async def _stream_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> AsyncIterator[str]:
        """Stream chat completion"""
        try:
            response = await acompletion(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            # For streaming, we yield the error so the client sees it
            # But we'll let the API server format it if possible, 
            # or just yield a cleaner message here
            yield f"Error: {str(e)}"
    
    async def chat_with_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Chat with function calling / tool use"""
        
        temp = temperature if temperature is not None else self.temperature
        max_tok = max_tokens if max_tokens is not None else self.max_tokens
        
        try:
            response = await acompletion(
                model=self.model,
                messages=messages,
                tools=tools,
                temperature=temp,
                max_tokens=max_tok,
            )
            
            choice = response.choices[0]
            result = {
                "content": choice.message.content,
                "tool_calls": []
            }
            
            # Extract tool calls if any
            if hasattr(choice.message, 'tool_calls') and choice.message.tool_calls:
                for tool_call in choice.message.tool_calls:
                    result["tool_calls"].append({
                        "id": tool_call.id,
                        "name": tool_call.function.name,
                        "arguments": tool_call.function.arguments,
                    })
            
            return result
            
        except Exception as e:
            print(f"LLM Error: {e}")
            return {
                "content": f"Error: {str(e)}",
                "tool_calls": []
            }


class ModelManager:
    """Manages multiple LLM instances for different purposes"""
    
    def __init__(self, config):
        self.config = config
        
        # If configured to use a local stub (for testing) or no API key is present,
        # use a minimal StubLLM that returns deterministic responses. This allows
        # the developer to test end-to-end socket and UI flows without external
        # LLM credentials.
        use_stub = os.getenv("LLM_STUB", "false").lower() == "true"
        no_key = not (config.model.api_key or "").strip()

        if use_stub or (no_key and config.model.provider != "ollama"):
            class StubLLM:
                def __init__(self, model=None, api_key=None, **kwargs):
                    self.model = model or "stub-model"
                async def chat(self, messages, temperature=None, max_tokens=None, stream=False):
                    # Build a valid agent JSON response instructing the 'response' tool
                    last = ""
                    for m in reversed(messages):
                        if m.get("role") == "user":
                            last = m.get("content", "")
                            break
                    message_text = f"[stub reply] Received: {last}"
                    payload = {
                        "thoughts": "StubLLM generated response",
                        "tool_name": "response",
                        "tool_args": {"message": message_text}
                    }
                    reply = json.dumps(payload)
                    if stream:
                        async def gen():
                            # yield the JSON in two chunks to simulate streaming
                            half = len(reply) // 2
                            yield reply[:half]
                            yield reply[half:]
                        return gen()
                    return reply

            self.chat_llm = StubLLM(model=config.model.chat_model)
        else:
            # Chat model (main reasoning)
            self.chat_llm = LLM(
                model=config.model.chat_model,
                api_key=config.model.api_key,
                temperature=config.model.temperature,
                max_tokens=config.model.max_tokens,
                max_context_tokens=config.model.max_context_tokens,
                provider=config.model.provider,
                ollama_base_url=config.model.ollama_base_url,
                custom_api_base=config.model.custom_api_base,
            )
        
        # Utility model (quick tasks like parsing, formatting)
        self.utility_llm = LLM(
            model=config.model.utility_model,
            api_key=config.model.api_key,
            temperature=0.3,  # Lower temperature for utility tasks
            max_tokens=2048,
            max_context_tokens=config.model.max_context_tokens,
            provider=config.model.provider,
            ollama_base_url=config.model.ollama_base_url,
            custom_api_base=config.model.custom_api_base,
        )
    
    def get_chat_model(self) -> LLM:
        """Get the main chat model"""
        return self.chat_llm
    
    def get_utility_model(self) -> LLM:
        """Get the utility model"""
        return self.utility_llm

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
    ) -> str | AsyncIterator[str]:
        """Send chat completion request"""
        
        temp = temperature if temperature is not None else self.config.model.temperature
        max_tok = max_tokens if max_tokens is not None else 4000
        
        try:
            # Prepare args for litellm
            kwargs = {
                "messages": messages,
                "temperature": self.config.model.temperature,
                "max_tokens": 4000,
                "stream": stream
            }

            # Provider-specific adjustments
            model_name = self.config.model.chat_model
            
            if self.config.model.provider == "github":
                # GitHub Models uses OpenAI-compatible endpoint
                kwargs["api_base"] = "https://models.inference.ai.azure.com"
                kwargs["api_key"] = self.config.model.api_key
                # Litellm needs 'openai/' prefix to know which client to use for custom base
                if not model_name.startswith("openai/"):
                    model_name = f"openai/{model_name}"
                
                # FIX: Litellm requires OPENAI_API_KEY env var to be present for the openai client
                # even if we pass api_key in kwargs. We set it temporarily.
                os.environ["OPENAI_API_KEY"] = self.config.model.api_key
            
            elif self.config.model.provider == "gemini":
                # Gemini models require special handling
                kwargs["api_base"] = "https://gemini.inference.ai.azure.com"
                kwargs["api_key"] = self.config.model.api_key
                # Litellm needs 'gemini/' prefix to know which client to use for custom base
                if not model_name.startswith("gemini/"):
                    model_name = f"gemini/{model_name}"
            
            # Call litellm with the constructed arguments
            response = await acompletion(
                model=model_name,
                **kwargs
            )
            
            if stream:
                # Streaming response handling
                async def stream_gen():
                    async for chunk in response:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                
                return stream_gen()
            else:
                return response.choices[0].message.content
            
        except Exception as e:
            print(f"LLM Error: {e}")
            # Return the raw error, let the caller format it
            raise e
    
    async def chat_with_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Chat with function calling / tool use"""
        
        temp = temperature if temperature is not None else self.config.model.temperature
        max_tok = max_tokens if max_tokens is not None else self.config.model.max_tokens
        
        try:
            response = await acompletion(
                model=self.config.model.chat_model,
                messages=messages,
                tools=tools,
                temperature=temp,
                max_tokens=max_tok,
            )
            
            choice = response.choices[0]
            result = {
                "content": choice.message.content,
                "tool_calls": []
            }
            
            # Extract tool calls if any
            if hasattr(choice.message, 'tool_calls') and choice.message.tool_calls:
                for tool_call in choice.message.tool_calls:
                    result["tool_calls"].append({
                        "id": tool_call.id,
                        "name": tool_call.function.name,
                        "arguments": tool_call.function.arguments,
                    })
            
            return result
            
        except Exception as e:
            print(f"LLM Error: {e}")
            return {
                "content": f"Error: {str(e)}",
                "tool_calls": []
            }


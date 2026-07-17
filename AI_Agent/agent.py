"""
HackrAct AI Agent - Core Agent Implementation

This is the main agent class that handles the reasoning loop, tool execution, and memory integration.
"""

import asyncio
import json
import os
import sys
import time
from typing import Dict, Any, List, Optional
from colorama import Fore, Style
from config import AgentConfig, load_config
from python.helpers.log import Logger, LogType
from python.helpers.llm import ModelManager
from python.helpers.memory import Memory

# Import tools
from python.tools.code_execution_tool import CodeExecutionTool  
from python.tools.memory_save import MemorySaveTool
from python.tools.memory_load import MemoryLoadTool
from python.tools.response import ResponseTool
from python.tools.search import SearchTool

# Max tool stdout/JSON shown in the web UI (full result still goes to the model).
UI_TOOL_OUTPUT_MAX_CHARS = 120_000
# Throttle WebSocket updates while the LLM stream is receiving tokens.
LLM_STREAM_EMIT_INTERVAL_SEC = 0.07
# Avoid huge WebSocket frames while streaming (tail of response is shown).
WS_THINKING_DISPLAY_MAX_CHARS = 100_000
# GitHub Models: keep tool result history small so the next LLM request stays under ~8k input tokens.
GITHUB_TOOL_RESULT_MAX_CHARS = 4_000


class Agent:
    """Main HackrAct AI Agent"""
    
    def __init__(self, config: Optional[AgentConfig] = None):
        # Load configuration
        self.config = config if config else load_config()
        
        # Set up logger
        self.logger = Logger(log_dir=self.config.log_dir)
        self.logger.info(
            heading=" HackrAct AI Agent Initializing",
            content=f"Agent: {self.config.name}\nChat Model: {self.config.model.chat_model}"
        )
        
        # Set up LLM
        self.model_manager = ModelManager(self.config)
        self.llm = self.model_manager.get_chat_model()
        
        # Set up memory
        if self.config.memory.enabled:
            self.memory = Memory(
                memory_dir=self.config.memory.memory_dir,
                collection_name=self.config.memory.collection_name,
                embedding_model=self.config.model.embedding_model,
                api_key=self.config.model.api_key,
                embedding_fallback_dimension=self.config.memory.embedding_fallback_dimension,
            )
            self.logger.success(
                heading="Memory System", 
                content=f"Initialized with {self.memory.count()} memories"
            )
        else:
            self.memory = None
            
        # Initialize tools
        self.tools = self._initialize_tools()
        self.logger.success(
            heading="Tools Loaded",
            content=f"Available tools: {', '.join(self.tools.keys())}"
        )
        
        # Load system prompt
        self.system_prompt = self._load_system_prompt()
        
        # Message history
        self.messages: List[Dict[str, str]] = []
        
        # Iteration counter
        self.iteration = 0
        
        # Stop flag
        self.stop_requested = False
        
        # Status callback
        self.status_callback = None
        
        # Initialize scratchpad
        self.scratchpad_path = os.path.join(self.config.work_dir, "scratchpad.md")
        self._init_scratchpad()

    def set_callback(self, callback):
        """Set callback for status updates"""
        self.status_callback = callback

    async def _emit_status(self, type: str, content: str, meta: Optional[Dict[str, Any]] = None):
        """Emit status update via callback (optional meta for UI: ProcessGroup modal, etc.)."""
        if self.status_callback:
            try:
                await self.status_callback(type, content, meta or {})
            except Exception as e:
                self.logger.error(f"Error in status callback: {e}")

    async def emit_terminal_chunk(self, text: str, is_stderr: bool = False) -> None:
        """Stream raw terminal bytes to the web UI (ProcessGroup terminal) as the process runs."""
        if not text:
            return
        await self._emit_status(
            "terminal_stream",
            text,
            {
                "iteration": getattr(self, "iteration", 0),
                "stderr": is_stderr,
            },
        )

    def stop(self):
        """Request the agent to stop processing and kill any running subprocess."""
        self.stop_requested = True
        self.logger.info("Stop requested by user")
        # Kill any running subprocess owned by the code_execution_tool
        cet = self.tools.get("code_execution_tool")
        if cet and hasattr(cet, "kill_running"):
            cet.kill_running()

    def _init_scratchpad(self):
        """Initialize the scratchpad file"""
        try:
            os.makedirs(self.config.work_dir, exist_ok=True)
            with open(self.scratchpad_path, 'w', encoding='utf-8') as f:
                f.write(f"# Agent Scratchpad\nSession Started: {self.config.name}\n")
        except Exception as e:
            self.logger.error(f"Failed to init scratchpad: {e}")

    def _log_step_to_scratchpad(self, iteration: int, thoughts: str, tool_name: str, tool_args: Any):
        """Log the current step to the scratchpad"""
        try:
            entry = f"\n\n## Iteration {iteration}\n"
            entry += f"**Thoughts:** {thoughts}\n"
            entry += f"**Tool:** `{tool_name}`\n"
            entry += f"**Args:** `{json.dumps(tool_args)}`\n"
            
            with open(self.scratchpad_path, 'a', encoding='utf-8') as f:
                f.write(entry)
        except Exception as e:
            self.logger.error(f"Failed to update scratchpad: {e}")

    async def ask_user_permission(self, question: str) -> bool:
        """Ask user for permission to execute a dangerous command"""
        # Only prompt when we actually have an interactive terminal.
        if not sys.stdin.isatty():
            self.logger.warning("Dangerous command requested in non-interactive mode; denying execution.")
            return False
        print(f"\n{question}")
        response = await asyncio.to_thread(input, "Type 'yes' to approve, anything else to deny: ")
        return response.strip().lower() == 'yes'

    def _initialize_tools(self) -> Dict[str, Any]:
        """Initialize all agent tools"""
        tools = {}
        
        tools["code_execution_tool"] = CodeExecutionTool(self)
        tools["memory_save"] = MemorySaveTool(self)
        tools["memory_load"] = MemoryLoadTool(self)
        tools["response"] = ResponseTool(self)
        tools["search"] = SearchTool(self)
        
        return tools
    
    def _load_system_prompt(self) -> str:
        """Load and construct system prompt from template files"""
        prompts_dir = self.config.prompts_dir
        
        # Lite prompts for low-context models; GitHub Models always (~8k input token API cap)
        use_lite = (
            self.config.model.max_context_tokens <= 10000
            or self.config.model.provider == "github"
        )
        
        # Load individual prompt sections
        def load_prompt(filename):
            path = os.path.join(prompts_dir, filename)
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read()
            return ""
        
        # Load all sections
        role = load_prompt("agent.system.main.role.md")
        environment = load_prompt("agent.system.main.environment.md")
        solving = load_prompt("agent.system.main.solving.md")
        communication = load_prompt("agent.system.main.communication.md")
        tips = load_prompt("agent.system.main.tips.md")
        
        # Load tool prompts
        tool_code_exe = load_prompt("agent.system.tool.code_exe.md")
        tool_memory_save = load_prompt("agent.system.tool.memory_save.md")
        tool_memory_load = load_prompt("agent.system.tool.memory_load.md")
        tool_response = load_prompt("agent.system.tool.response.md")
        tool_search = load_prompt("agent.system.tool.search.md")
        
        # Load main template
        main_template = load_prompt("agent.system.main.md")
        
        # CONDENSE PROMPTS FOR LITE MODE
        if use_lite:
            self.logger.info("Using LITE system prompt for low-context model")
            
            # Condense Role
            role = "You are HackrAct, an autonomous AI penetration tester. You specialize in Web App Security (OWASP Top 10). You have full access to Kali Linux tools and can install anything via apt-get/pip/npm. Always execute actions, don't just describe them."
            
            # Condense Environment
            environment = "Environment: Kali Linux container. Root access. Network access enabled."
            
            # Condense Solving
            solving = "Methodology: Recon -> Scan -> Exploit -> Report. Be thorough and methodical."
            
            # Condense Communication
            communication = "Be concise. Report technical findings clearly."
            tips = (
                "Verify with tool output; retry failed commands once after fixing; "
                "use memory tools for durable notes; prefer shell for simple tasks; "
                "markdown-friendly final answers (headings, lists, code fences)."
            )
            
            # Condense Tool Prompts (Massive savings here)
            tool_code_exe = """## Code Execution Tool
`code_execution_tool`
Execute shell commands, Python, or Node.js.
Params: `language` ("shell"|"python"|"nodejs"), `code` (string), `timeout` (int).
You can install tools via `apt-get install -y <tool>`.
Example: `{"language": "shell", "code": "nmap -sV target"}`"""

            tool_memory_save = """## Memory Save
`memory_save`
Save important findings.
Params: `content` (string), `category` (string), `tags` (list)."""

            tool_memory_load = """## Memory Load
`memory_load`
Search past findings.
Params: `query` (string), `max_results` (int)."""

            tool_response = """## Response
`response`
Send final answer to user.
Params: `message` (string)."""

            tool_search = """## Search
`search`
Web search for CVEs, exploits, threat intel.
Params: `query` (string), `max_results` (int)."""

        # Substitute sections into template
        system_prompt = main_template.format(
            role=role,
            environment=environment,
            solving=solving,
            communication=communication,
            tips=tips,
            tool_code_exe=tool_code_exe,
            tool_memory_save=tool_memory_save,
            tool_memory_load=tool_memory_load,
            tool_response=tool_response,
            tool_search=tool_search,
        )

        # GitHub Models: long few-shot examples in main.md can exceed ~8k input tokens alone
        if self.config.model.provider == "github":
            max_sys = int(os.getenv("GITHUB_MAX_SYSTEM_CHARS", "8000"))
            if len(system_prompt) > max_sys:
                system_prompt = (
                    system_prompt[:max_sys]
                    + "\n\n… [system prompt truncated for GitHub Models input limit]"
                )

        return system_prompt
    
    def _estimate_msg_tokens(self, content: str) -> float:
        """Rough token estimate; conservative for GitHub (BPE uses more than chars/4)."""
        if not content:
            return 0.0
        if self.config.model.provider == "github":
            return max(len(content) / 2.5, 1.0)  # conservative for GitHub Models' tighter request limit
        return len(content) / 4.0

    def _manage_context(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Manage context window by trimming old messages if necessary.
        Always keeps the system prompt and the last user message.
        """
        max_tokens = float(self.config.model.max_context_tokens)
        if self.config.model.provider == "github":
            # Hard ceiling: GitHub returns 400 if total input exceeds ~8000 tokens
            max_tokens = min(max_tokens, float(os.getenv("GITHUB_MAX_INPUT_BUDGET", "5200")))

        def total_est(msgs: List[Dict[str, str]]) -> float:
            return sum(self._estimate_msg_tokens(m.get("content") or "") for m in msgs)

        current_tokens = total_est(messages)
        if current_tokens <= max_tokens:
            return messages

        self.logger.info(f"Context limit exceeded (~{int(current_tokens)}/{int(max_tokens)} est. tokens). Trimming history...")

        system_prompt = messages[0]
        last_message = messages[-1]
        sys_t = self._estimate_msg_tokens(system_prompt.get("content") or "")
        last_t = self._estimate_msg_tokens(last_message.get("content") or "")
        buffer = 120.0 if self.config.model.provider == "github" else 500.0
        available_tokens = max_tokens - sys_t - last_t - buffer

        if available_tokens < 0:
            # Truncate oversized single messages (e.g. huge tool output) for last turn
            lm = dict(last_message)
            cap = (
                int(os.getenv("GITHUB_MAX_LAST_MESSAGE_CHARS", "2200"))
                if self.config.model.provider == "github"
                else 8000
            )
            c = lm.get("content") or ""
            if len(c) > cap:
                lm["content"] = c[:cap] + "\n\n… [truncated for context limit]"
            return [system_prompt, lm]

        history: List[Dict[str, str]] = []
        history_tokens = 0.0
        for msg in reversed(messages[1:-1]):
            msg_tokens = self._estimate_msg_tokens(msg.get("content") or "")
            if history_tokens + msg_tokens > available_tokens:
                break
            history.insert(0, msg)
            history_tokens += msg_tokens

        return [system_prompt, *history, last_message]

    async def process_message(self, user_message: str) -> str:
        """
        Process a user message and return response
        
        This is the main reasoning loop of the agent
        """
        
        self.logger.info(
            heading="👤 User Message",
            content=user_message
        )
        
        # Add user message to history
        self.messages.append({
            "role": "user",
            "content": user_message
        })
        
        # Agent loop
        final_response = ""
        self.iteration = 0
        self.stop_requested = False

        try:
            final_response = await self._agent_loop()
        except asyncio.CancelledError:
            self.logger.info("Agent cancelled (stop); killing subprocesses")
            self.stop_requested = True
            cet = self.tools.get("code_execution_tool")
            if cet and hasattr(cet, "kill_running"):
                cet.kill_running()
            raise

        if not final_response:
            final_response = "Maximum iterations reached without completing the task."

        return final_response

    async def _agent_loop(self) -> str:
        """Inner reasoning loop (separate for clean CancelledError handling)."""
        final_response = ""

        while self.iteration < self.config.max_iterations:
            # Check for stop request
            if self.stop_requested:
                self.logger.info("Agent execution stopped by user request")
                return "🛑 Agent execution stopped by user request."

            self.iteration += 1
            
            self.logger.info(
                heading=f"🤖 Agent Iteration {self.iteration}",
                content="Processing..."
            )
            
            await self._emit_status(
                "thinking",
                f"Iteration {self.iteration}: Thinking...",
                {"iteration": self.iteration, "phase": "llm_pending"},
            )
            await self._emit_status(
                "llm_start",
                "Calling LLM…",
                {"iteration": self.iteration, "chat_model": self.config.model.chat_model},
            )

            # Get agent response
            messages = [
                {"role": "system", "content": self.system_prompt},
                *self.messages
            ]
            
            # Manage context window
            messages = self._manage_context(messages)
            
            try:
                # Stream agent response
                print(f"\n{Fore.BLUE}{Style.BRIGHT}[AGENT] Thinking...{Style.RESET_ALL}")
                agent_response = ""
                stream_emit_next = 0.0

                # Get the async generator from the LLM
                stream_gen = await self.llm.chat(messages, stream=True)
                try:
                    async for chunk in stream_gen:
                        if self.stop_requested:
                            break
                        # Check for error in stream
                        if chunk.startswith("Error:"):
                            raise Exception(chunk)

                        print(f"{Fore.BLUE}{chunk}{Style.RESET_ALL}", end="", flush=True)
                        agent_response += chunk
                        # Live "thinking" in the ProcessGroup UI (throttled for WebSocket)
                        now = time.monotonic()
                        if now >= stream_emit_next:
                            disp = agent_response
                            if len(disp) > WS_THINKING_DISPLAY_MAX_CHARS:
                                disp = (
                                    "… (earlier stream truncated for UI)\n\n"
                                    + disp[-WS_THINKING_DISPLAY_MAX_CHARS:]
                                )
                            await self._emit_status(
                                "thinking",
                                disp,
                                {
                                    "iteration": self.iteration,
                                    "streaming": True,
                                    "chat_model": self.config.model.chat_model,
                                },
                            )
                            stream_emit_next = now + LLM_STREAM_EMIT_INTERVAL_SEC
                finally:
                    aclose = getattr(stream_gen, "aclose", None)
                    if callable(aclose):
                        try:
                            await stream_gen.aclose()
                        except Exception:
                            pass

                if self.stop_requested:
                    await self._emit_status("status", "🛑 Stopped.", {"iteration": self.iteration})
                    return "🛑 Agent execution stopped by user request."

                # Final flush so the UI has the complete model text before JSON parse
                disp_final = agent_response
                if len(disp_final) > WS_THINKING_DISPLAY_MAX_CHARS:
                    disp_final = (
                        "… (earlier stream truncated for UI)\n\n"
                        + disp_final[-WS_THINKING_DISPLAY_MAX_CHARS:]
                    )
                await self._emit_status(
                    "thinking",
                    disp_final,
                    {
                        "iteration": self.iteration,
                        "streaming": False,
                        "chat_model": self.config.model.chat_model,
                    },
                )
                print()  # Newline after stream
                
                # Log to history/file but don't print again
                self.logger.agent(
                    heading="Agent Thinking",
                    content=agent_response,
                    print_console=False
                )
                
                # Parse JSON response
                response_data = self._parse_agent_response(agent_response)
                
                if not response_data:
                    # Failed to parse - ask agent to retry
                    self.messages.append({
                        "role": "assistant",
                        "content": agent_response
                    })
                    self.messages.append({
                        "role": "user",
                        "content": "Please respond in valid JSON format with 'thoughts', 'tool_name', and 'tool_args'"
                    })
                    continue
                
                # Add to message history
                self.messages.append({
                    "role": "assistant",
                    "content": agent_response
                })
                
                # Log to scratchpad
                self._log_step_to_scratchpad(
                    self.iteration,
                    response_data.get("thoughts", "No thoughts provided"),
                    response_data.get("tool_name"),
                    response_data.get("tool_args")
                )
                
                # Emit thoughts (meta for ProcessGroup step details modal)
                if "thoughts" in response_data:
                    raw_trunc = agent_response[:24000] if len(agent_response) > 24000 else agent_response
                    th = response_data["thoughts"]
                    if isinstance(th, list):
                        th_text = "\n".join(str(x) for x in th)
                    else:
                        th_text = str(th)
                    await self._emit_status(
                        "thought",
                        th_text,
                        {
                            "iteration": self.iteration,
                            "tool_name": response_data.get("tool_name"),
                            "tool_args": response_data.get("tool_args"),
                            "raw_model_response": raw_trunc,
                            "chat_model": self.config.model.chat_model,
                            "temperature": self.config.model.temperature,
                            "max_tokens": self.config.model.max_tokens,
                        },
                    )

                # Execute tool
                if self.stop_requested:
                    self.logger.info("Agent execution stopped by user request before tool execution")
                    return "🛑 Agent execution stopped by user request."

                tool_name = response_data.get("tool_name")
                tool_args = response_data.get("tool_args", {})
                
                if tool_name != "response":
                    await self._emit_status(
                        "tool",
                        f"Executing tool: {tool_name}",
                        {
                            "iteration": self.iteration,
                            "tool_name": tool_name,
                            "tool_args": tool_args,
                            "chat_model": self.config.model.chat_model,
                        },
                    )

                tool_result = await self._execute_tool(
                    tool_name,
                    tool_args
                )
                
                if tool_name != "response":
                    result_str = json.dumps(tool_result, indent=2)
                    streamed = bool(tool_result.get("streamed_to_ui"))
                    if streamed:
                        ec = tool_result.get("exit_code", 0)
                        ok = tool_result.get("success", False)
                        display_str = (
                            f"\n--- Finished · exit {ec} · success={ok} "
                            f"(output was streamed live above) ---"
                        )
                        meta_out: Dict[str, Any] = {
                            "tool_name": tool_name,
                            "truncated": False,
                            "streamed_to_ui": True,
                            "result_chars": len(result_str),
                            "chat_model": self.config.model.chat_model,
                        }
                    else:
                        ui_truncated = len(result_str) > UI_TOOL_OUTPUT_MAX_CHARS
                        if ui_truncated:
                            display_str = (
                                result_str[:UI_TOOL_OUTPUT_MAX_CHARS]
                                + "\n\n… (truncated for UI display; full output is in the agent context)"
                            )
                        else:
                            display_str = result_str
                        meta_out = {
                            "tool_name": tool_name,
                            "truncated": ui_truncated,
                            "result_chars": len(result_str),
                            "chat_model": self.config.model.chat_model,
                        }
                    if len(result_str) <= 120000:
                        meta_out["result"] = tool_result
                    else:
                        meta_out["result"] = {"_note": "Output too large for details modal; see streamed content."}
                    await self._emit_status("tool_output", f"Tool Output:\n{display_str}", meta_out)
                
                # Check if this was final response
                if response_data.get("tool_name") == "response":
                    final_response = tool_result.get("message", "")
                    break
                
                # Add tool result to messages (truncate for low-context providers)
                tool_json = json.dumps(tool_result, indent=2)
                if (
                    self.config.model.provider == "github"
                    and len(tool_json) > GITHUB_TOOL_RESULT_MAX_CHARS
                ):
                    tool_json = (
                        tool_json[:GITHUB_TOOL_RESULT_MAX_CHARS]
                        + "\n\n… [truncated for GitHub Models input limit; rerun with smaller output if needed]"
                    )
                self.messages.append({
                    "role": "user",
                    "content": f"Tool result: {tool_json}",
                })

            except asyncio.CancelledError:
                raise
            except Exception as e:
                error_str = str(e)
                err_type = type(e).__name__

                # Fatal errors — abort the loop immediately (no point retrying)
                FATAL_ERRORS = (
                    "AuthenticationError", "InvalidApiKeyError",
                    "RateLimitError", "ModelNotFoundError",
                    "BadCredentials", "Bad credentials",
                )
                is_fatal = (
                    err_type in FATAL_ERRORS
                    or any(k in error_str for k in FATAL_ERRORS)
                )
                if is_fatal:
                    self.logger.error(
                        heading="Fatal LLM Error — aborting",
                        content=error_str,
                    )
                    friendly = self._format_fatal_error(e)
                    await self._emit_status("error", friendly)
                    return friendly

                self.logger.error(
                    heading="Error in agent loop",
                    content=error_str,
                )
                # Add error to messages and continue
                self.messages.append({
                    "role": "user",
                    "content": f"Error occurred: {error_str}. Please try a different approach.",
                })

        if not final_response:
            final_response = "Maximum iterations reached without completing the task."

        return final_response

    def _format_fatal_error(self, error: Exception) -> str:
        """Return a short, user-friendly message for fatal LLM errors."""
        error_str = str(error)
        err_type = type(error).__name__
        if err_type in ("AuthenticationError", "InvalidApiKeyError") or any(
            k in error_str for k in ("Bad credentials", "Invalid API key", "api_key client option must be set")
        ):
            return (
                "Authentication failed: Your API key is missing or invalid. "
                "Please update API_KEY in AI_Agent/.env and restart the agent."
            )
        if err_type == "RateLimitError" or "rate limit" in error_str.lower():
            return "Rate limit exceeded. Please wait a moment and try again."
        if err_type == "ModelNotFoundError" or "model not found" in error_str.lower():
            return f"Model not found: '{self.config.model.chat_model}'. Please check your CHAT_MODEL setting."
        return f"Fatal error: {error_str.split(' - ')[0]}"

    def _parse_agent_response(self, response: str) -> Optional[Dict[str, Any]]:
        """Parse agent's JSON response"""
        try:
            # Try to extract JSON from response
            # Look for first { and last }
            start = response.find('{')
            end = response.rfind('}') + 1
            
            if start >= 0 and end > start:
                json_str = response[start:end]
                data = json.loads(json_str)
                return data
            
            return None
            
        except json.JSONDecodeError as e:
            self.logger.error(
                heading="JSON Parse Error",
                content=f"Could not parse agent response: {str(e)}"
            )
            return None
    
    async def _execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with given arguments"""
        
        if not tool_name:
            return {"success": False, "error": "No tool specified"}

        if self.stop_requested:
            return {
                "success": False,
                "error": "Stopped by user before tool run",
                "stopped": True,
            }
        
        if tool_name not in self.tools:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}
        
        try:
            tool = self.tools[tool_name]
            result = await tool.execute(**tool_args)
            return result
            
        except Exception as e:
            self.logger.error(
                heading=f"Tool Execution Error: {tool_name}",
                content=str(e)
            )
            return {
                "success": False,
                "error": f"Tool execution failed: {str(e)}"
            }
    
    async def run_interactive(self):
        """Run interactive CLI session"""
        
        print("\n" + "=" * 70)
        print("  HackrAct AI Agent - Interactive Mode")
        print("=" * 70)
        print("Type your requests, or 'exit' to quit\n")
        
        while True:
            try:
                # Get user input
                user_input = input("\n👤 You: ").strip()
                
                if user_input.lower() in ['exit', 'quit', 'q']:
                    print("\n Goodbye!\n")
                    break
                
                if not user_input:
                    continue
                
                # Process message
                response = await self.process_message(user_input)
                
                # Display response
                print(f"\n HackrAct: {response}\n")
                
            except KeyboardInterrupt:
                print("\n\n Interrupted. Goodbye!\n")
                break
            except Exception as e:
                print(f"\n Error: {str(e)}\n")


async def main():
    """Main entry point"""
    
    # Create agent
    agent = Agent()
    
    # Run interactive mode
    await agent.run_interactive()


if __name__ == "__main__":
    asyncio.run(main())

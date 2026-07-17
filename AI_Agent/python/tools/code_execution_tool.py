"""Code execution tool for running terminal commands and scripts"""

import asyncio
import subprocess
import os
import signal
import sys
from colorama import Fore, Style
from typing import Dict, Any, Optional
from python.helpers.tool import Tool


class CodeExecutionTool(Tool):
    """Execute code in terminal - essential for running hacking tools"""
    
    def __init__(self, agent):
        super().__init__(
            agent=agent,
            name="code_execution_tool",
            description="Execute Python, Shell, or Node.js code in the terminal. Use for running security tools like nmap, nikto, sqlmap, etc."
        )
        self.work_dir = agent.config.work_dir
        os.makedirs(self.work_dir, exist_ok=True)
        self._running_process: Optional[asyncio.subprocess.Process] = None

    def kill_running(self) -> None:
        """Kill the currently running subprocess (called by Agent.stop())."""
        proc = self._running_process
        if proc is None or proc.returncode is not None:
            return

        # Try graceful stop first, then force-kill process tree if it doesn't exit quickly.
        self._request_stop(proc)
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._force_kill_later(proc, delay=1.5))
        except RuntimeError:
            self._kill_proc(proc)

    async def _force_kill_later(self, proc: asyncio.subprocess.Process, delay: float = 1.5) -> None:
        """Force-kill process tree if graceful stop did not terminate it in time."""
        try:
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            return
        if proc.returncode is None:
            self._kill_proc(proc)

    async def _emit_stream_chunk(self, text: str, is_stderr: bool = False) -> None:
        """Forward process output to the web UI in real time."""
        if not text or not hasattr(self.agent, "emit_terminal_chunk"):
            return
        await self.agent.emit_terminal_chunk(text, is_stderr=is_stderr)

    async def execute(
        self,
        language: str = "shell",
        code: str = "",
        timeout: int = 300,
    ) -> Dict[str, Any]:
        """
        Execute code in the specified language
        
        Args:
            language: 'python', 'shell', 'bash', 'nodejs'
            code: Code to execute
            timeout: Maximum execution time in seconds
        """
        
        self.log_tool_use({"language": language, "code": code[:200]})
        
        if not code.strip():
            return {"success": False, "error": "No code provided"}
            
        # 1. Check for FORBIDDEN patterns (Strict Block)
        if hasattr(self.agent.config.code_exec, 'forbidden_patterns'):
            for pattern in self.agent.config.code_exec.forbidden_patterns:
                if pattern in code:
                    return {
                        "success": False,
                        "error": f"SECURITY VIOLATION: Command contains forbidden pattern '{pattern}'. Execution blocked."
                    }

        # 2. Check for dangerous commands if approval is required
        if self.agent.config.code_exec.require_approval:
            is_dangerous = any(keyword in code for keyword in self.agent.config.code_exec.dangerous_keywords)
            if is_dangerous:
                # In a real interactive CLI, we would ask the user here.
                # For the API/Agent loop, we might need to return a specific status 
                # or pause execution. For now, we'll log a warning and proceed 
                # if it's just a warning, or block if strict.
                # Let's implement a simple blocking check for the CLI context:
                if hasattr(self.agent, 'ask_user_permission'):
                    approved = await self.agent.ask_user_permission(
                        f"⚠️  DANGEROUS COMMAND DETECTED:\n{code}\n\nAllow execution?"
                    )
                    if not approved:
                        return {
                            "success": False, 
                            "error": "Command execution denied by user."
                        }
        
        try:
            # Log code execution
            if self.logger:
                self.logger.code(
                    heading=f"Executing {language} code",
                    content=code
                )
            
            # Execute based on language
            if language.lower() in ["shell", "bash", "sh"]:
                result = await self._execute_shell(code, timeout)
            elif language.lower() in ["python", "python3", "py"]:
                result = await self._execute_python(code, timeout)
            elif language.lower() in ["javascript", "nodejs", "node", "js"]:
                result = await self._execute_nodejs(code, timeout)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported language: {language}"
                }
            
            self.log_tool_result(result)
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "output": "",
                "exit_code": -1,
            }
            self.log_tool_result(error_result)
            return error_result
    
    async def _execute_shell(self, code: str, timeout: int) -> Dict[str, Any]:
        """Execute shell commands"""
        process: Optional[asyncio.subprocess.Process] = None
        try:
            # Run in PowerShell on Windows, bash on Linux
            proc_kwargs: Dict[str, Any] = {}
            if os.name == "nt":
                proc_kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            else:
                proc_kwargs["start_new_session"] = True

            if os.name == 'nt':  # Windows
                process = await asyncio.create_subprocess_shell(
                    code,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    shell=True,
                    cwd=self.work_dir,
                    **proc_kwargs,
                )
            else:  # Linux/Mac
                sandboxed_code = f"ulimit -v 4194304; ulimit -u 100; {code}"
                process = await asyncio.create_subprocess_shell(
                    sandboxed_code,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    shell=True,
                    executable='/bin/bash',
                    cwd=self.work_dir,
                    **proc_kwargs,
                )
            self._running_process = process
            
            # Stream output
            output_str = ""
            error_str = ""
            
            async def read_stream(stream, is_stderr=False):
                nonlocal output_str, error_str
                while True:
                    if self.agent.stop_requested:
                        break
                    chunk = await stream.read(4096)
                    if not chunk:
                        break
                    decoded = chunk.decode("utf-8", errors="replace")
                    if is_stderr:
                        error_str += decoded
                        print(f"{Fore.RED}{decoded}{Style.RESET_ALL}", end="", flush=True)
                    else:
                        output_str += decoded
                        print(f"{Fore.LIGHTBLACK_EX}{decoded}{Style.RESET_ALL}", end="", flush=True)
                    await self._emit_stream_chunk(decoded, is_stderr=is_stderr)

            # Wait for completion with timeout
            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        read_stream(process.stdout),
                        read_stream(process.stderr, is_stderr=True),
                        process.wait(),
                    ),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                self._kill_proc(process)
                raise asyncio.TimeoutError("Command timed out")
            
            # --- Structured Output Parsing (Nmap) ---
            # If nmap was run with XML output (-oX), try to parse it for better LLM consumption
            if "nmap" in code and "-oX" in code:
                try:
                    import xml.etree.ElementTree as ET
                    import re
                    
                    # Find the XML filename in the command
                    match = re.search(r'-oX\s+([^\s]+)', code)
                    if match:
                        xml_file = match.group(1)
                        xml_path = os.path.join(self.work_dir, xml_file)
                        
                        if os.path.exists(xml_path):
                            tree = ET.parse(xml_path)
                            root = tree.getroot()
                            
                            summary = []
                            for host in root.findall('host'):
                                address = host.find('address').get('addr')
                                ports = []
                                for port in host.findall('.//port'):
                                    portid = port.get('portid')
                                    state = port.find('state').get('state')
                                    service = port.find('service')
                                    service_name = service.get('name') if service is not None else "unknown"
                                    product = service.get('product') if service is not None else ""
                                    version = service.get('version') if service is not None else ""
                                    
                                    if state == 'open':
                                        ports.append(f"{portid}/tcp ({service_name}) {product} {version}")
                                
                                if ports:
                                    summary.append(f"Host: {address}\nOpen Ports:\n  - " + "\n  - ".join(ports))
                            
                            if summary:
                                parsed_output = "\n\n[Parsed Nmap Summary]:\n" + "\n".join(summary)
                                output_str += parsed_output
                                await self._emit_stream_chunk(parsed_output, is_stderr=False)
                except Exception as parse_err:
                    # Don't fail the execution if parsing fails, just log it
                    error_str += f"\n[Warning: Failed to parse Nmap XML: {str(parse_err)}]"

            # --- Structured Output Parsing (SQLMap) ---
            # If sqlmap was run, try to find the output directory and summarize findings
            if "sqlmap" in code:
                try:
                    # SQLMap usually stores results in ~/.sqlmap/output/ or custom dir
                    # We look for CSV logs if available or just check for success indicators in stdout
                    if "vulnerable" in output_str.lower() or "injected" in output_str.lower():
                        summary = "\n\n[Parsed SQLMap Summary]:\n⚠️  POSSIBLE VULNERABILITY DETECTED\n"
                        for line in output_str.splitlines():
                            if "Parameter:" in line or "Type:" in line or "Title:" in line:
                                summary += line.strip() + "\n"
                        output_str += summary
                        await self._emit_stream_chunk(summary, is_stderr=False)
                except Exception:
                    pass

            # --- Structured Output Parsing (FFuf) ---
            # If ffuf was run with -o (JSON), parse it
            if "ffuf" in code and "-o" in code:
                try:
                    import json
                    import re
                    match = re.search(r'-o\s+([^\s]+)', code)
                    if match:
                        json_file = match.group(1)
                        json_path = os.path.join(self.work_dir, json_file)
                        if os.path.exists(json_path):
                            with open(json_path, 'r') as f:
                                data = json.load(f)
                            
                            summary = ["\n\n[Parsed FFuf Summary]:"]
                            if "results" in data:
                                for res in data["results"]:
                                    # Only show interesting results (e.g. 200 OK or redirects)
                                    if res.get("status") in [200, 301, 302, 401, 403]:
                                        url = res.get("url")
                                        status = res.get("status")
                                        length = res.get("length")
                                        summary.append(f"Status: {status} | Size: {length} | URL: {url}")
                            
                            if len(summary) > 1:
                                extra = "\n".join(summary)
                                output_str += extra
                                await self._emit_stream_chunk(extra, is_stderr=False)
                except Exception:
                    pass

            self._running_process = None
            return {
                "success": process.returncode == 0,
                "output": output_str,
                "error": error_str,
                "exit_code": process.returncode,
                "streamed_to_ui": True,
            }

        except asyncio.CancelledError:
            self._kill_proc(process)
            self._running_process = None
            raise
        except asyncio.TimeoutError:
            self._kill_proc(process)
            self._running_process = None
            return {
                "success": False,
                "output": output_str,
                "error": error_str + f"\nExecution timed out after {timeout} seconds",
                "exit_code": -1,
                "streamed_to_ui": True,
            }

    @staticmethod
    def _request_stop(proc: asyncio.subprocess.Process) -> None:
        """Try a graceful interrupt before force killing."""
        if proc is None or proc.returncode is not None:
            return
        try:
            if os.name == "nt":
                ctrl_break = getattr(signal, "CTRL_BREAK_EVENT", None)
                if ctrl_break is not None:
                    proc.send_signal(ctrl_break)
                else:
                    proc.terminate()
            elif hasattr(os, "killpg"):
                os.killpg(os.getpgid(proc.pid), signal.SIGINT)
            else:
                proc.terminate()
        except (ProcessLookupError, PermissionError, OSError):
            pass

    @staticmethod
    def _kill_proc(proc: asyncio.subprocess.Process) -> None:
        if proc is None or proc.returncode is not None:
            return
        try:
            if os.name == "nt":
                try:
                    subprocess.run(
                        ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=False,
                    )
                except Exception:
                    pass
                proc.kill()
            elif hasattr(os, "killpg"):
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            else:
                proc.kill()
        except (ProcessLookupError, PermissionError, OSError):
            pass

    async def _execute_python(self, code: str, timeout: int) -> Dict[str, Any]:
        """Execute Python code"""
        # Save code to temp file
        temp_file = os.path.join(self.work_dir, "_temp_exec.py")
        with open(temp_file, 'w') as f:
            f.write(code)
        
        process: Optional[asyncio.subprocess.Process] = None
        try:
            exec_kwargs: Dict[str, Any] = {}
            if os.name == "nt":
                exec_kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            else:
                exec_kwargs["start_new_session"] = True

            process = await asyncio.create_subprocess_exec(
                "python3" if os.name != "nt" else "python",
                temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.work_dir,
                **exec_kwargs,
            )
            self._running_process = process
            out_acc = ""
            err_acc = ""

            async def pump(stream, is_err: bool):
                nonlocal out_acc, err_acc
                while True:
                    if self.agent.stop_requested:
                        break
                    chunk = await stream.read(4096)
                    if not chunk:
                        break
                    t = chunk.decode("utf-8", errors="replace")
                    if is_err:
                        err_acc += t
                    else:
                        out_acc += t
                    await self._emit_stream_chunk(t, is_stderr=is_err)

            await asyncio.wait_for(
                asyncio.gather(
                    pump(process.stdout, False),
                    pump(process.stderr, True),
                    process.wait(),
                ),
                timeout=timeout,
            )
            self._running_process = None
            return {
                "success": process.returncode == 0,
                "output": out_acc,
                "error": err_acc,
                "exit_code": process.returncode,
                "streamed_to_ui": True,
            }

        except asyncio.CancelledError:
            self._kill_proc(process)
            self._running_process = None
            raise
        except asyncio.TimeoutError:
            self._kill_proc(process)
            self._running_process = None
            return {
                "success": False,
                "output": "",
                "error": f"Execution timed out after {timeout} seconds",
                "exit_code": -1,
            }
        finally:
            # Clean up temp file
            if os.path.exists(temp_file):
                os.remove(temp_file)
    
    async def _execute_nodejs(self, code: str, timeout: int) -> Dict[str, Any]:
        """Execute Node.js code"""
        # Save code to temp file
        temp_file = os.path.join(self.work_dir, "_temp_exec.js")
        with open(temp_file, 'w') as f:
            f.write(code)
        
        process: Optional[asyncio.subprocess.Process] = None
        try:
            exec_kwargs: Dict[str, Any] = {}
            if os.name == "nt":
                exec_kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            else:
                exec_kwargs["start_new_session"] = True

            process = await asyncio.create_subprocess_exec(
                "node",
                temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.work_dir,
                **exec_kwargs,
            )
            self._running_process = process
            out_acc = ""
            err_acc = ""

            async def pump(stream, is_err: bool):
                nonlocal out_acc, err_acc
                while True:
                    if self.agent.stop_requested:
                        break
                    chunk = await stream.read(4096)
                    if not chunk:
                        break
                    t = chunk.decode("utf-8", errors="replace")
                    if is_err:
                        err_acc += t
                    else:
                        out_acc += t
                    await self._emit_stream_chunk(t, is_stderr=is_err)

            await asyncio.wait_for(
                asyncio.gather(
                    pump(process.stdout, False),
                    pump(process.stderr, True),
                    process.wait(),
                ),
                timeout=timeout,
            )
            self._running_process = None
            return {
                "success": process.returncode == 0,
                "output": out_acc,
                "error": err_acc,
                "exit_code": process.returncode,
                "streamed_to_ui": True,
            }

        except asyncio.CancelledError:
            self._kill_proc(process)
            self._running_process = None
            raise
        except asyncio.TimeoutError:
            self._kill_proc(process)
            self._running_process = None
            return {
                "success": False,
                "output": "",
                "error": f"Execution timed out after {timeout} seconds",
                "exit_code": -1,
            }
        finally:
            # Clean up temp file
            if os.path.exists(temp_file):
                os.remove(temp_file)

"""
HackrAct AI Agent - REST API Server

FastAPI server exposing the agent via REST API and WebSocket for frontend integration.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import asyncio
import json
import uuid
import os
import sys
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from agent import Agent
from config import load_config, ConfigValidationError

# Initialize FastAPI app
app = FastAPI(
    title="HackrAct AI Agent API",
    description="REST API for HackrAct AI penetration testing agent",
    version="1.0.0"
)

# CORS: use AI_AGENT_CORS_ORIGINS (comma-separated) in production; "*" for dev when unset
_cors_origins = os.getenv("AI_AGENT_CORS_ORIGINS", "").strip()
_cors_origins_list = [o.strip() for o in _cors_origins.split(",") if o.strip()] if _cors_origins else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active agents and conversations
active_agents: Dict[str, Agent] = {}
conversations: Dict[str, List[Dict]] = {}
# Current asyncio.Task running agent.process_message per session (for Stop to cancel LLM wait)
_ws_agent_tasks: Dict[str, asyncio.Task] = {}


def format_error_message(error: Exception) -> str:
    """Format error message for user display. Prefer exception types where available."""
    error_str = str(error)
    err_type = type(error).__name__

    # Auth / API key (by type or message)
    if err_type in ("AuthenticationError", "InvalidApiKeyError") or any(
        x in error_str for x in (
            "Missing Anthropic API Key", "Missing OpenAI API Key", "Missing Gemini API Key",
            "AuthenticationError", "Invalid API key", "api_key client option must be set",
        )
    ):
        return "Authentication failed: Missing or invalid API Key. Please check your settings."
    if "OpenAIException" in err_type or "api_key client option must be set" in error_str:
        return "Authentication failed: GitHub Models requires a valid Personal Access Token. Please check your settings."

    # Connection (by type or message)
    if err_type in ("ConnectionError", "ConnectTimeout", "ConnectError") or any(
        x in error_str for x in ("ConnectionError", "ConnectTimeout", "Connection refused")
    ):
        return "Connection failed: Could not connect to the AI provider. Please check your internet connection."

    # Rate limit
    if err_type == "RateLimitError" or "RateLimitError" in error_str or "rate limit" in error_str.lower():
        return "Rate limit exceeded: Please try again later or check your API quota."

    # Model not found
    if err_type == "ModelNotFoundError" or "ModelNotFoundError" in error_str or "model not found" in error_str.lower():
        return "Model not found: The selected model is not available. Please check your settings."

    # Generic: strip "Error:" prefix and take first part before " - "
    if error_str.startswith("Error: "):
        error_str = error_str[7:]
    return f"An error occurred: {error_str.split(' - ')[0] if ' - ' in error_str else error_str}"


# Limits for API/WebSocket (avoid abuse and OOM)
MAX_MESSAGE_LENGTH = int(os.getenv("AI_AGENT_MAX_MESSAGE_LENGTH", "65536"))  # 64k chars
MAX_WS_PAYLOAD_BYTES = int(os.getenv("AI_AGENT_MAX_WS_PAYLOAD_BYTES", "65536"))  # 64k

# Pydantic models for API
class MessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    session_id: Optional[str] = None


class MessageResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str


class SessionInfo(BaseModel):
    session_id: str
    created_at: str
    message_count: int


class HealthResponse(BaseModel):
    status: str
    version: str
    agent_name: str
    config_error: Optional[str] = None  # set when status is "degraded" (invalid LLM config)


# Helper functions
def get_or_create_agent(session_id: str) -> Agent:
    """Get existing agent or create new one for session. Validates config when creating."""
    if session_id not in active_agents:
        config = load_config(validate=True)
        active_agents[session_id] = Agent(config)
        conversations[session_id] = []
    return active_agents[session_id]


def save_message(session_id: str, role: str, content: str):
    """Save message to conversation history"""
    if session_id not in conversations:
        conversations[session_id] = []
    
    conversations[session_id].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    })


# API Endpoints

@app.get("/api/health", response_model=HealthResponse)
async def api_health_check():
    """Health check endpoint. Returns 200 even if LLM config is invalid (status=degraded) so probes still pass."""
    try:
        config = load_config()
        return {
            "status": "online",
            "version": "1.0.0",
            "agent_name": config.name,
        }
    except ConfigValidationError as e:
        return {
            "status": "degraded",
            "version": "1.0.0",
            "agent_name": os.getenv("AGENT_NAME", "HackrAct"),
            "config_error": str(e),
        }


@app.post("/api/message", response_model=MessageResponse)
async def send_message(request: MessageRequest):
    """
    Send a message to the agent and get response
    
    - **message**: The message/request to send to the agent
    - **session_id**: Optional session ID to maintain conversation context
    """
    # Generate or use provided session ID
    session_id = request.session_id or str(uuid.uuid4())
    try:
        agent = get_or_create_agent(session_id)
    except ConfigValidationError as e:
        raise HTTPException(status_code=503, detail=str(e))
    
    # Save user message
    save_message(session_id, "user", request.message)
    
    try:
        # Process message with agent
        response = await agent.process_message(request.message)
        
        # Save agent response
        save_message(session_id, "assistant", response)
        
        return {
            "response": response,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        error_msg = format_error_message(e)
        raise HTTPException(status_code=500, detail=f"Agent error: {error_msg}")


@app.get("/api/sessions", response_model=List[SessionInfo])
async def list_sessions():
    """List all active sessions"""
    sessions = []
    for session_id, messages in conversations.items():
        sessions.append({
            "session_id": session_id,
            "created_at": messages[0]["timestamp"] if messages else datetime.now().isoformat(),
            "message_count": len(messages)
        })
    return sessions


@app.get("/api/session/{session_id}/history")
async def get_session_history(session_id: str):
    """Get conversation history for a session"""
    if session_id not in conversations:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "messages": conversations[session_id]
    }


@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its conversation history"""
    if session_id in active_agents:
        del active_agents[session_id]
    if session_id in conversations:
        del conversations[session_id]
    
    return {"status": "deleted", "session_id": session_id}


@app.post("/api/session/{session_id}/clear")
async def clear_session(session_id: str):
    """Clear conversation history but keep agent instance"""
    if session_id not in conversations:
        raise HTTPException(status_code=404, detail="Session not found")
    
    conversations[session_id] = []
    
    # Reset agent's message history
    if session_id in active_agents:
        active_agents[session_id].messages = []
    
    return {"status": "cleared", "session_id": session_id}


@app.post("/api/session/{session_id}/stop")
async def stop_agent(session_id: str):
    """Stop the agent if it's currently running"""
    if session_id in active_agents:
        active_agents[session_id].stop()
        t = _ws_agent_tasks.get(session_id)
        if t is not None and not t.done():
            t.cancel()
        return {"status": "stopped", "session_id": session_id}
    return {"status": "not_running", "session_id": session_id}


# WebSocket endpoint for real-time streaming
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time agent interaction
    
    Send JSON: {"message": "your message"}
    Receive JSON: {"type": "response|thinking|tool|error", "content": "..."}
    """
    await websocket.accept()
    try:
        agent = get_or_create_agent(session_id)
    except ConfigValidationError as e:
        await websocket.send_json({"type": "error", "content": str(e)})
        await websocket.close()
        return
    
    try:
        while True:
            # Receive message from client (enforce payload size limit)
            data = await websocket.receive_text()
            if len(data.encode("utf-8")) > MAX_WS_PAYLOAD_BYTES:
                await websocket.send_json({
                    "type": "error",
                    "content": f"Message too large. Maximum size is {MAX_WS_PAYLOAD_BYTES} bytes."
                })
                continue
            message_data = json.loads(data)
            # Debug: log incoming WS messages for troubleshooting
            print(f"[ws] received for session {session_id}: {message_data}")
            
            # Handle stop command: flag + kill subprocess + cancel in-flight agent task (LLM stream)
            if message_data.get("type") == "stop":
                agent.stop()
                t = _ws_agent_tasks.get(session_id)
                if t is not None and not t.done():
                    t.cancel()
                await websocket.send_json({
                    "type": "status",
                    "content": "🛑 Stopping agent..."
                })
                continue

            user_message = message_data.get("message", "") or ""
            if len(user_message) > MAX_MESSAGE_LENGTH:
                await websocket.send_json({
                    "type": "error",
                    "content": f"Message too long. Maximum length is {MAX_MESSAGE_LENGTH} characters."
                })
                continue
            
            if not user_message:
                await websocket.send_json({
                    "type": "error",
                    "content": "Empty message"
                })
                continue
            
            # Save user message
            save_message(session_id, "user", user_message)
            
            # Send acknowledgment
            await websocket.send_json({
                "type": "status",
                "content": "Processing..."
            })
            
            try:
                # Define callback for status updates
                async def status_callback(type: str, content: str, meta: Optional[dict] = None):
                    payload: Dict[str, Any] = {"type": type, "content": content}
                    if meta:
                        payload["meta"] = meta
                    await websocket.send_json(payload)
                
                # Set callback on agent
                agent.set_callback(status_callback)

                async def _run_agent() -> str:
                    return await agent.process_message(user_message)

                task = asyncio.create_task(_run_agent())
                _ws_agent_tasks[session_id] = task
                try:
                    response = await task
                except asyncio.CancelledError:
                    agent.set_callback(None)
                    save_message(session_id, "assistant", "🛑 Agent execution stopped.")
                    await websocket.send_json({
                        "type": "response",
                        "content": "🛑 Agent execution stopped.",
                        "timestamp": datetime.now().isoformat(),
                    })
                    continue
                finally:
                    _ws_agent_tasks.pop(session_id, None)

                # Clear callback
                agent.set_callback(None)

                # Save response
                save_message(session_id, "assistant", response)

                # Send complete response
                await websocket.send_json({
                    "type": "response",
                    "content": response,
                    "timestamp": datetime.now().isoformat()
                })

            except Exception as e:
                error_msg = format_error_message(e)
                await websocket.send_json({
                    "type": "error",
                    "content": error_msg
                })
    
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")


# Memory endpoints
@app.get("/api/memory/count")
async def get_memory_count():
    """Get count of items in memory"""
    config = load_config()
    if config.memory.enabled:
        from python.helpers.memory import Memory
        memory = Memory(
            memory_dir=config.memory.memory_dir,
            collection_name=config.memory.collection_name,
            embedding_model=config.model.embedding_model,
            api_key=config.model.api_key,
            embedding_fallback_dimension=config.memory.embedding_fallback_dimension,
        )
        count = memory.count()
        return {"count": count}
    return {"count": 0, "enabled": False}


@app.get("/api/memory/search")
async def search_memory(query: str, max_results: int = 5):
    """Search memory for relevant information"""
    config = load_config()
    if not config.memory.enabled:
        raise HTTPException(status_code=503, detail="Memory not enabled")
    
    from python.helpers.memory import Memory
    memory = Memory(
        memory_dir=config.memory.memory_dir,
        collection_name=config.memory.collection_name,
        embedding_model=config.model.embedding_model,
        api_key=config.model.api_key,
        embedding_fallback_dimension=config.memory.embedding_fallback_dimension,
    )
    
    results = await memory.recall(query, max_results)
    return {"query": query, "results": results}


class TestConnectionRequest(BaseModel):
    llm_provider: str
    api_key: Optional[str] = ""
    chat_model: str
    custom_endpoint: Optional[str] = None


@app.post("/api/test_connection")
async def test_connection(request: TestConnectionRequest):
    """Test LLM connection with provided settings"""
    from python.helpers.llm import LLM
    import requests
    import os
    
    try:
        if request.llm_provider == "ollama":
            base_url = request.custom_endpoint or "http://localhost:11434"
            
            # If running in Docker (which is common for this project), localhost refers to the container itself.
            # We need to map localhost to host.docker.internal to reach the host machine's Ollama instance.
            if ("localhost" in base_url or "127.0.0.1" in base_url) and os.path.exists('/.dockerenv'):
                base_url = base_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

            try:
                resp = requests.get(f"{base_url}/api/tags", timeout=5)
                resp.raise_for_status()
                models = resp.json().get("models", [])
                model_names = [m.get("name") for m in models]
                
                response_msg = f"Ollama is running at {base_url}!\n"
                if request.chat_model and request.chat_model not in model_names:
                    response_msg += f"Warning: '{request.chat_model}' is not pulled locally. Available models: {', '.join(model_names) if model_names else 'None'}"
                else:
                    response_msg += f"Model '{request.chat_model}' is available."
                
                return {"status": "success", "message": "Connection successful!", "response": response_msg}
            except Exception as e:
                raise Exception(f"Could not connect to Ollama at {base_url}. Is it running? (Error: {str(e)})")

        # Setup base URL properly for docker env when using LLM integration
        ollama_url = request.custom_endpoint or "http://localhost:11434"
        if request.llm_provider == "ollama" and ("localhost" in ollama_url or "127.0.0.1" in ollama_url) and os.path.exists('/.dockerenv'):
            ollama_url = ollama_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

        # Use saved API key from env when test body omits it (e.g. UI "Test" without re-pasting secret)
        test_key = (request.api_key or "").strip()
        if not test_key and request.llm_provider != "ollama":
            cfg = load_config(validate=False)
            test_key = (cfg.model.api_key or "").strip()

        # Initialize LLM with provided settings
        llm = LLM(
            provider=request.llm_provider,
            api_key=test_key,
            model=request.chat_model,
            custom_api_base=request.custom_endpoint or "",
            ollama_base_url=ollama_url
        )
        
        # Try a simple generation
        response = await llm.chat([{"role": "user", "content": "Hello"}], max_tokens=10)
        
        if response.startswith("Error:"):
             raise HTTPException(status_code=400, detail=response)
             
        return {"status": "success", "message": "Connection successful!", "response": response}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@app.get("/api/settings")
async def get_settings():
    """Get current configuration settings. API key is never returned; use api_key_set for UI."""
    try:
        config = load_config(validate=True)
    except ConfigValidationError:
        # Allow UI to open after a bad save (e.g. empty key + github); show current env without failing
        config = load_config(validate=False)
    key = config.model.api_key or ""
    return {
        "llm_provider": config.model.provider,
        "api_key_set": bool(key),
        "api_key_masked": ("****" + key[-4:]) if len(key) >= 4 else ("****" if key else ""),
        "chat_model": config.model.chat_model,
        "utility_model": config.model.utility_model,
        "custom_endpoint": config.model.custom_api_base,
        "memory_enabled": config.memory.enabled,
        "collection_name": config.memory.collection_name,
        "embedding_model": config.model.embedding_model,
        "temperature": config.model.temperature,
        "max_tokens": config.model.max_tokens
    }


@app.post("/api/settings")
async def save_settings(settings: Dict[str, Any]):
    """Save configuration settings to .env file"""
    from config import save_config_to_env
    
    try:
        success = save_config_to_env(settings)
        if success:
            # Reload dotenv to pick up changes
            from dotenv import load_dotenv
            load_dotenv(override=True)
            
            # Clear active agents so they are recreated with new config
            active_agents.clear()
            
            return {"status": "success", "message": "Settings saved successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save settings")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving settings: {str(e)}")


@app.post("/api/memory/clear")
async def clear_memory():
    """Clear all memories"""
    config = load_config()
    if not config.memory.enabled:
        raise HTTPException(status_code=503, detail="Memory not enabled")
    
    try:
        from python.helpers.memory import Memory
        memory = Memory(
            memory_dir=config.memory.memory_dir,
            collection_name=config.memory.collection_name,
            embedding_model=config.model.embedding_model,
            api_key=config.model.api_key,
            embedding_fallback_dimension=config.memory.embedding_fallback_dimension,
        )
        
        # Clear the collection
        memory.collection.delete(where={})
        
        return {"status": "success", "message": "All memories cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing memories: {str(e)}")


@app.get("/api/memory/list")
async def list_memories():
    """List all memories"""
    config = load_config()
    if not config.memory.enabled:
        raise HTTPException(status_code=503, detail="Memory not enabled")
    
    try:
        from python.helpers.memory import Memory
        memory = Memory(
            memory_dir=config.memory.memory_dir,
            collection_name=config.memory.collection_name,
            embedding_model=config.model.embedding_model,
            api_key=config.model.api_key,
            embedding_fallback_dimension=config.memory.embedding_fallback_dimension,
        )
        
        # Get all items from collection
        result = memory.collection.get()
        
        memories = []
        if result and 'documents' in result:
            for i, doc in enumerate(result['documents']):
                memories.append({
                    'id': result['ids'][i] if 'ids' in result else i,
                    'content': doc,
                    'metadata': result['metadatas'][i] if 'metadatas' in result else {}
                })
        
        return {"count": len(memories), "memories": memories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing memories: {str(e)}")


# Serve static files (Frontend)
# Prefer React build in static_build/, fall back to legacy static/ for dev
# Resolve paths relative to this file so the server can be started from any cwd
_base_dir = os.path.dirname(os.path.abspath(__file__))
_static_build_dir = os.path.join(_base_dir, "static_build")
_static_dir = _static_build_dir if os.path.isdir(_static_build_dir) else os.path.join(_base_dir, "static")
app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8008,
        reload=False,  # Disabled for Docker
        log_level="info"
    )

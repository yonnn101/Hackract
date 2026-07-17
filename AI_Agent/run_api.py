"""
Run API Server

Entry point for running the FastAPI server.
Port: set AI_AGENT_PORT (default 8008) or PORT.
Health: GET http://<host>:<port>/api/health
"""

import os
import uvicorn
from api_server import app

_PORT = int(os.getenv("AI_AGENT_PORT", os.getenv("PORT", "8008")))

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print(" HackrAct AI Agent - API Server")
    print("=" * 70)
    print(f"API running at: http://localhost:{_PORT}")
    print(f"Health check:  http://localhost:{_PORT}/api/health")
    print(f"API Documentation: http://localhost:{_PORT}/docs")
    print(f"WebSocket: ws://localhost:{_PORT}/ws/{{session_id}}")
    print("=" * 70 + "\n")
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=_PORT,
        reload=False,  # Disabled for Docker - causes file watcher errors
        log_level="info"
    )

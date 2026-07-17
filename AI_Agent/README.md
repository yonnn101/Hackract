# HackrAct AI Agent

**Autonomous AI security agent powered by large language models**

HackrAct is an AI-driven assistant for **authorized** security testing, vulnerability assessment, and security research. It reasons in a loop, calls tools (shell / Python / Node.js), optional web search, and a vector memory store.

> **LEGAL DISCLAIMER**: For **authorized** security testing and education **only**. Unauthorized access to systems is illegal. Obtain **explicit written permission** before testing any target.

---

## Features

- **Web UI (React)**: Chat interface with live **process viewer** (LLM thinking stream, tool calls, terminal output), settings panel, and session persistence in the browser.
- **FastAPI + WebSocket**: Real-time updates; REST endpoints for health, settings, and memory.
- **Agent loop**: Streaming LLM responses, JSON tool plans, tool execution with stop/cancel support.
- **Code execution**: Shell, Python, and Node.js (tools like `nmap` can be installed inside the container with `apt` when needed).
- **Memory (optional)**: ChromaDB-backed recall/save for findings when enabled.
- **Multiple LLM backends**: OpenRouter, OpenAI, Anthropic, Gemini, **GitHub Models**, Ollama, Groq, Mistral, DeepSeek, custom OpenAI-compatible APIs (via LiteLLM).
- **Docker**: Default image is **minimal Debian** (fast builds); optional **`Dockerfile.full`** for a heavier tool-focused image.

---

## Architecture

```
HackrAct
├── frontend/              # React (Vite) SPA
│   └── npm run build → ../static_build/
├── api_server.py          # FastAPI: REST + WebSocket /ws/{session_id}
├── agent.py               # Reasoning loop, streaming, tool orchestration
├── config.py              # .env / provider limits (e.g. GitHub ~8k input)
├── python/helpers/llm.py  # LiteLLM integration
├── python/tools/          # code_execution, memory_*, search, response
├── prompts/               # System prompts (lite mode for small contexts)
├── static_build/          # Production UI (served by FastAPI; gitignored build output)
└── Dockerfile             # Multi-stage: Node build + Debian slim runtime
```

**Runtime flow**

1. Browser loads UI from `static_build/` (or `static/` fallback).
2. User messages go over **WebSocket**; agent streams `thinking`, `thought`, `tool`, `terminal_stream`, `tool_output`, then `response`.
3. UI shows a **process group** under each user turn: scrollable card, **Thinking** / **Tool execution** sections (each can be minimized).

---

## Quick start (Docker)

### Prerequisites

- Docker & Docker Compose
- An API key for your LLM provider (or local **Ollama**)

### Steps

1. **Clone and enter the project directory** (repository path may vary):

   ```bash
   cd AI_Agent
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   # Edit .env: LLM_PROVIDER, API_KEY (or GITHUB_TOKEN for GitHub Models), CHAT_MODEL, etc.
   ```

3. **Run**

   ```bash
   docker compose up --build
   ```

4. **Open the app**

   - **UI**: [http://localhost:8008](http://localhost:8008)  
   - **Health**: [http://localhost:8008/api/health](http://localhost:8008/api/health)  
   - **OpenAPI**: [http://localhost:8008/docs](http://localhost:8008/docs)

Default API port is **8008** (`AI_AGENT_PORT` / `PORT` in `.env`).

### Optional: full tool image

`docker-compose.yml` can be pointed at `Dockerfile.full` for a larger image with more preinstalled tooling (see comments in the compose file).

---

## Local development (no Docker)

### Backend / CLI

```bash
pip3 install -r requirements.txt
cp .env.example .env
# API + web UI (serves static_build if present)
python3 run_api.py
# Or interactive CLI only:
python3 run_cli.py
```

Without a prior `npm run build`, ensure `static_build/` exists or the server falls back to legacy `static/`.

### Frontend (React)

```bash
cd frontend
npm ci   # or npm install
npm run dev    # Vite dev server; proxies /api and /ws to http://localhost:8008
npm run build  # Writes production assets to ../static_build/
```

Run `python3 run_api.py` on **8008** while using `npm run dev` so API and WebSocket calls work.

---

## Web UI overview

| Area | Purpose |
|------|--------|
| **Chat** | Messages, composer, **Stop** (cancels agent task + running subprocess where supported). |
| **Process group** | Per user message: task title, badges, **Thinking** (LLM stream + reasoning), **Tool execution** (commands + terminal). Inner **scroll** keeps long runs compact; **Minimize** on each section hides that track. |
| **New chat** | Clears messages + process groups for the session (browser `localStorage`). |
| **Settings** | Provider, models, memory, test connection, save to `.env` (API key not echoed back). |

Step bodies in the process viewer are **always fully expanded** (no global “expand mode” toggle).

---

## Configuration (`.env`)

See **`.env.example`** for the full list. Common variables:

| Variable | Notes |
|----------|--------|
| `LLM_PROVIDER` | e.g. `openrouter`, `openai`, `anthropic`, `github`, `ollama`, … |
| `API_KEY` | Provider secret; for GitHub Models a PAT with models access works |
| `GITHUB_TOKEN` | Optional alias if `API_KEY` is empty and provider is `github` |
| `CHAT_MODEL` | Model id as required by the provider |
| `GITHUB_MAX_CONTEXT_TOKENS`, `GITHUB_MAX_INPUT_BUDGET`, … | Tune if GitHub returns “request body too large” (~8k input limit) |
| `AI_AGENT_PORT` | HTTP port (default `8008`) |
| `MEMORY_ENABLED`, `MEMORY_DIR`, collection name | Via settings API / env |

---

## Agent tools (built-in)

| Tool | Role |
|------|------|
| **code_execution_tool** | Run shell / Python / Node.js (timeouts, streaming stdout/stderr to UI). |
| **memory_save** / **memory_load** | Store and recall text findings (if memory enabled). |
| **search** | Web search (when configured). |
| **response** | Final natural-language reply to the user. |

Security scanners and exploit frameworks are **not** bundled in the default Docker image; the agent may install packages with **`apt`** / **`pip`** / **`npm`** inside the container when appropriate for your engagement.

---

## Memory system

When enabled, the agent can save structured notes and recall them in later turns. Categories include exploit, vulnerability, credential, technique, finding (see agent prompts). ChromaDB stores embeddings under `memory/`.

---

## Security & ethics

**Do:** test only systems you own or are **authorized** to test; use isolated lab networks; handle leaked credentials responsibly.

**Don’t:** probe third-party systems without permission; use findings maliciously; skip responsible disclosure where it applies.

Running in **Docker** reduces host exposure; still scope network access carefully.

---

## Graduation / academic use

Suitable to demonstrate: agentic loops, tool use, LLM streaming, WebSocket UX, optional RAG/memory, containerized deployment, and ethical-use framing.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **API / LLM auth errors** | `.env` `API_KEY` / `GITHUB_TOKEN`, provider name, model id. Use **Settings → Test connection**. |
| **GitHub Models “body too large”** | Reduce context: see `GITHUB_*` vars in `.env.example`; agent uses a lite prompt and truncation for GitHub. |
| **Blank or old UI** | Run `cd frontend && npm run build`; hard-refresh browser; Docker volume should mount project so `static_build/` updates. |
| **WebSocket disconnected** | Server running; correct host/port; reverse proxy must support WebSocket upgrade. |
| **Stop doesn’t feel instant** | Backend cancels the asyncio task and kills the active code-execution subprocess; very slow provider calls may still take a moment. |
| **Python import errors** | `pip3 install -r requirements.txt` |

---

## Project layout (reference)

```
AI_Agent/
├── agent.py
├── api_server.py
├── config.py
├── run_api.py
├── run_cli.py
├── requirements.txt
├── Dockerfile
├── Dockerfile.full          # optional heavier image
├── docker-compose.yml
├── frontend/                # React source
├── static_build/            # production UI build (generated)
├── prompts/
├── python/
├── memory/, logs/, work_dir/
└── README.md
```

---

## Further reading

- **[LLM_PROVIDER_GUIDE.md](LLM_PROVIDER_GUIDE.md)** — provider-specific setup  
- **[EXAMPLES.md](EXAMPLES.md)** — example prompts and scenarios  
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** / **[API_QUICKSTART.md](API_QUICKSTART.md)** — REST & WebSocket details  

---

## Contributing

Fork → feature branch → PR. Keep changes compatible with Docker and the React build pipeline.

---

## License & acknowledgments

Educational / research use; comply with local laws and provider terms.

- LLM routing via **LiteLLM**  
- UI: **React**, **Vite**, **marked** + **DOMPurify** for assistant markdown  

---

**Use HackrAct ethically and only where you have permission.**

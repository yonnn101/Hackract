# API Server - Quick Start Guide

## 🚀 Running the API

### With Docker (Recommended)

```bash
# Build and start
docker-compose up --build

# The API will be available at http://localhost:8008
```

### Without Docker (Local)

```bash
# Install dependencies
pip3 install -r requirements.txt

# Run API server
python3 run_api.py
```

## 🌐 Access Points

Once running, you can access:

- **API Server**: http://localhost:8008
- **Health check**: http://localhost:8008/api/health
- **Interactive API Docs**: http://localhost:8008/docs
- **Alternative Docs**: http://localhost:8008/redoc
- **Example Frontend**: Open `static/index.html` in your browser

## 📡 Quick API Test

### Using curl:
```bash
# Health check
curl http://localhost:8008/api/health

# Send a message
curl -X POST http://localhost:8008/api/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What tools are available?"}'
```

### Using the Example Frontend:

1. Start the API: `docker-compose up`
2. Open `frontend_example.html` in your browser
3. Start chatting with the agent!

## 🔌 Frontend Integration

### Basic JavaScript Example:

```javascript
async function askAgent(message) {
    const response = await fetch('http://localhost:8008/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message,
            session_id: 'my-session-123'
        })
    });
    
    const data = await response.json();
    console.log(data.response);
}

// Use it
askAgent('Scan localhost for open ports');
```

## 📖 Full Documentation

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API reference.

## 🔄 Switching Between CLI and API Mode

### Run API Server:
```bash
docker-compose up  # Default mode
```

### Run CLI Mode:
Edit `docker-compose.yml` and change:
```yaml
command: python3 run_cli.py
```

Then:
```bash
docker-compose up
docker exec -it hackract_ai_agent /bin/bash
```

## 🛠️ Development

### Enable Auto-Reload:
The API server runs with `reload=True` by default, so code changes will automatically restart the server.

### View Logs:
```bash
docker-compose logs -f
```

### Access Container:
```bash
docker exec -it hackract_ai_agent /bin/bash
```

## 🎨 Building Your Frontend

The API supports any frontend framework:

- **React**: See examples in API_DOCUMENTATION.md
- **Vue**: See examples in API_DOCUMENTATION.md
- **Angular**: Use HttpClient with the REST endpoints
- **Vanilla JS**: See `frontend_example.html`

### Key Endpoints for Frontend:

```
POST /api/message         - Send message, get response
GET  /api/sessions        - List all sessions
GET  /api/session/{id}/history  - Get conversation history
WS   /ws/{session_id}     - WebSocket for real-time chat
```

## ⚠️ Important Notes

- **CORS**: Enabled for all origins by default (change for production)
- **Session Management**: Sessions are in-memory (add Redis for persistence)
- **API Key**: No authentication by default (add for production)
- **Rate Limiting**: Not implemented (add for production)

---

For full API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

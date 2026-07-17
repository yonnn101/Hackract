# HackrAct AI Agent - API Documentation

## 🚀 Quick Start

### Running the API Server

```bash
# With Docker
docker-compose up

# Or locally
python run_api.py
```

The API will be available at (port configurable via `AI_AGENT_PORT` or `PORT`, default 8008):
- **Base URL**: `http://localhost:8008`
- **Health check**: `GET http://localhost:8008/api/health`
- **API Docs**: `http://localhost:8008/docs` (Interactive Swagger UI)
- **Alternative Docs**: `http://localhost:8008/redoc`
- **WebSocket**: `ws://localhost:8008/ws/{session_id}`

---

## 📡 REST API Endpoints

### Health Check

**GET** `/api/health`

Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "agent_name": "HackrAct"
}
```

---

### Send Message to Agent

**POST** `/api/message`

Send a message/task to the agent and get a response.

**Request Body:**
```json
{
  "message": "Scan localhost for open ports",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "I'll perform a port scan on localhost...",
  "session_id": "uuid-session-id",
  "timestamp": "2025-11-21T00:30:00"
}
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:8008/api/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Test http://example.com for SQL injection',
    session_id: 'my-session-123'
  })
});

const data = await response.json();
console.log(data.response);
```

**Example (Python):**
```python
import requests

response = requests.post('http://localhost:8008/api/message', json={
    'message': 'Scan localhost for open ports',
    'session_id': 'my-session-123'
})

print(response.json()['response'])
```

**Example (curl):**
```bash
curl -X POST http://localhost:8008/api/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What tools are available?"}'
```

---

### List Sessions

**GET** `/api/sessions`

Get list of all active sessions.

**Response:**
```json
[
  {
    "session_id": "uuid-1",
    "created_at": "2025-11-21T00:25:00",
    "message_count": 5
  },
  {
    "session_id": "uuid-2",
    "created_at": "2025-11-21T00:28:00",
    "message_count": 3
  }
]
```

---

### Get Session History

**GET** `/api/session/{session_id}/history`

Get conversation history for a specific session.

**Response:**
```json
{
  "session_id": "uuid-1",
  "messages": [
    {
      "role": "user",
      "content": "Scan localhost",
      "timestamp": "2025-11-21T00:25:00"
    },
    {
      "role": "assistant",
      "content": "I'll scan localhost...",
      "timestamp": "2025-11-21T00:25:05"
    }
  ]
}
```

---

### Clear Session

**POST** `/api/session/{session_id}/clear`

Clear conversation history for a session (keeps agent instance).

**Response:**
```json
{
  "status": "cleared",
  "session_id": "uuid-1"
}
```

---

### Delete Session

**DELETE** `/api/session/{session_id}`

Delete a session completely (removes agent instance and history).

**Response:**
```json
{
  "status": "deleted",
  "session_id": "uuid-1"
}
```

---

### Memory Count

**GET** `/api/memory/count`

Get count of items stored in agent's memory.

**Response:**
```json
{
  "count": 42
}
```

---

### Search Memory

**GET** `/api/memory/search?query=sql+injection&max_results=5`

Search agent's memory for relevant information.

**Parameters:**
- `query` (required): Search query
- `max_results` (optional): Number of results (default: 5)

**Response:**
```json
{
  "query": "sql injection",
  "results": [
    {
      "id": "mem_123",
      "content": "SQL injection payload: ' OR '1'='1' --",
      "metadata": {
        "category": "exploit",
        "tags": ["sqli"]
      },
      "distance": 0.15
    }
  ]
}
```

---

## 🔌 WebSocket API

For real-time, bidirectional communication.

### Connect to WebSocket

**URL**: `ws://localhost:8008/ws/{session_id}`

### Send Message

```javascript
const ws = new WebSocket('ws://localhost:8008/ws/my-session-123');

ws.onopen = () => {
  // Send message to agent
  ws.send(JSON.stringify({
    message: 'Scan localhost for vulnerabilities'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'status') {
    console.log('Status:', data.content);
  } else if (data.type === 'response') {
    console.log('Agent response:', data.content);
  } else if (data.type === 'error') {
    console.error('Error:', data.content);
  }
};
```

### Message Types

**Client → Server:**
```json
{
  "message": "your message here"
}
```

**Server → Client:**
```json
{
  "type": "status|response|error",
  "content": "...",
  "timestamp": "2025-11-21T00:30:00"
}
```

**Types:**
- `status`: Agent is processing
- `response`: Final response from agent
- `error`: Error occurred

---

## 🎨 Frontend Integration Examples

### React Example

```jsx
import { useState } from 'react';

function ChatComponent() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = 'my-session-123';

  const sendMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8008/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: sessionId })
      });
      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask the agent..."
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Processing...' : 'Send'}
      </button>
      <div>{response}</div>
    </div>
  );
}
```

### Vue Example

```vue
<template>
  <div>
    <input v-model="message" placeholder="Ask the agent..." />
    <button @click="sendMessage" :disabled="loading">
      {{ loading ? 'Processing...' : 'Send' }}
    </button>
    <div>{{ response }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: '',
      response: '',
      loading: false,
      sessionId: 'my-session-123'
    };
  },
  methods: {
    async sendMessage() {
      this.loading = true;
      try {
        const res = await fetch('http://localhost:8008/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: this.message, 
            session_id: this.sessionId 
          })
        });
        const data = await res.json();
        this.response = data.response;
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

### WebSocket React Hook

```javascript
import { useEffect, useState } from 'react';

function useAgentWebSocket(sessionId) {
  const [ws, setWs] = useState(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const websocket = new WebSocket(`ws://localhost:8008/ws/${sessionId}`);
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'response') {
        setResponse(data.content);
      } else if (data.type === 'status') {
        setStatus(data.content);
      }
    };

    setWs(websocket);
    
    return () => websocket.close();
  }, [sessionId]);

  const sendMessage = (message) => {
    if (ws) {
      ws.send(JSON.stringify({ message }));
    }
  };

  return { sendMessage, response, status };
}
```

---

## 🔒 CORS Configuration

By default, CORS is enabled for all origins (`*`). For production, update `api_server.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.com"],  # Specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐳 Docker Deployment

The API is automatically started when you run:

```bash
docker-compose up
```

**Ports exposed:**
- `8008`: API server (override with AI_AGENT_PORT or PORT)

**To run only the API (not CLI):**

Update `docker-compose.yml`:
```yaml
command: python3 run_api.py
```

---

## 📊 API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid input) |
| 404 | Not Found (session doesn't exist) |
| 500 | Server Error (agent error) |
| 503 | Service Unavailable (e.g., memory disabled) |

---

## 🧪 Testing the API

### Using Swagger UI

Navigate to `http://localhost:8008/docs` for interactive API testing.

### Using curl

```bash
# Health check
curl http://localhost:8008/health

# Send message
curl -X POST http://localhost:8008/api/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you do?"}'

# List sessions
curl http://localhost:8008/api/sessions

# Search memory
curl "http://localhost:8008/api/memory/search?query=sql%20injection&max_results=3"
```

### Using Postman

Import this collection:
```json
{
  "info": { "name": "HackrAct AI Agent API" },
  "item": [
    {
      "name": "Send Message",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/message",
        "body": {
          "mode": "raw",
          "raw": "{\"message\": \"Scan localhost\"}"
        }
      }
    }
  ],
  "variable": [
    { "key": "base_url", "value": "http://localhost:8008" }
  ]
}
```

---

## 📝 Notes

- **Session Management**: Each frontend user should have a unique `session_id`
- **Persistence**: Sessions are stored in memory and lost on restart (implement Redis for persistence)
- **Rate Limiting**: Consider adding rate limiting for production
- **Authentication**: Add API key authentication for security
- **Streaming**: For true streaming responses, the agent loop needs modification

---

For more information, see the [main README](README.md).

import api from '../api/axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const ACCESS_TOKEN_KEY = 'hackract_access_token';

export const createAgentSession = (data) =>
  api.post('/ai-agents', data).then((r) => r.data);

export const getAgentSession = (id) =>
  api.get(`/ai-agents/${id}`).then((r) => r.data);

export const listAgentSessions = (pentestId) =>
  api.get('/ai-agents', { params: pentestId ? { pentestId } : {} }).then((r) => r.data);

export const chatWithAgent = (id, message) =>
  api.post(`/ai-agents/${id}/chat`, { message }).then((r) => r.data);

export const stopAgent = (id) =>
  api.post(`/ai-agents/${id}/stop`).then((r) => r.data);

export const getAgentLogs = (id) =>
  api.get(`/ai-agents/${id}/logs`).then((r) => r.data);

export const getAgentHealth = () =>
  api.get('/ai-agents/health').then((r) => r.data);

export const deployAgent = (id, pentestId) =>
  api.post(`/ai-agents/${id}/deploy`, { pentestId }).then((r) => r.data);

export const streamChatWithAgent = async (id, message, onEvent, signal) => {
  const res = await fetch(`${API_BASE_URL}/ai-agents/${id}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    credentials: 'include',
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Agent stream failed (${res.status})`);
  }

  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const consumeChunk = (chunk) => {
    buffer += chunk;
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const lines = part.split('\n');
      const dataLine = lines.find((line) => line.startsWith('data: '));
      if (!dataLine) continue;

      try {
        const payload = JSON.parse(dataLine.slice(6));
        onEvent?.(payload);
      } catch {
        // Ignore malformed chunks and keep stream alive.
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    consumeChunk(decoder.decode(value, { stream: true }));
  }

  const tail = decoder.decode();
  if (tail) consumeChunk(tail);
};

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import prisma from '../src/database/prismaClient.js';

const BACKEND_BASE_URL = process.env.STREAM_TEST_BACKEND_URL || 'http://127.0.0.1:4000';

function parseSseChunk(buffer, onEvent) {
  const frames = buffer.split('\n\n');
  const rest = frames.pop() || '';

  for (const frame of frames) {
    const lines = frame.split('\n');
    const dataLine = lines.find((line) => line.startsWith('data: '));
    if (!dataLine) continue;
    try {
      const payload = JSON.parse(dataLine.slice(6));
      onEvent(payload);
    } catch {
      // Ignore malformed payloads and keep stream alive.
    }
  }

  return rest;
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  let assistant = await prisma.aiAssistant.findFirst({ select: { id: true, name: true } });

  if (!user?.id) {
    throw new Error('No user found in DB. Cannot generate auth token.');
  }
  if (!assistant?.id) {
    const created = await prisma.aiAssistant.create({
      data: {
        name: `Stream Smoke Assistant ${Date.now()}`,
        model: 'gpt-4o-mini',
        systemPrompt: 'Smoke test assistant used for integration verification.',
        capabilities: ['chat'],
        isActive: true,
      },
      select: { id: true, name: true },
    });
    assistant = created;
  }
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('Missing JWT_ACCESS_SECRET in Backend/.env');
  }

  const token = jwt.sign({ id: user.id, sub: user.id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });

  const agent = await prisma.aiAgent.create({
    data: {
      userId: user.id,
      assistantId: assistant.id,
      name: 'Stream Smoke Test Agent',
      isActive: true,
      messages: [],
    },
    select: { id: true },
  });

  const url = `${BACKEND_BASE_URL}/api/v1/ai-agents/${agent.id}/chat/stream`;
  const body = { message: 'Reply with exact token STREAM_OK once ready.' };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Stream endpoint failed (${res.status}): ${txt}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');

  const eventTypes = [];
  const samples = [];
  let donePayload = null;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = parseSseChunk(buffer, (payload) => {
      eventTypes.push(payload.type || 'unknown');
      if (samples.length < 8) {
        samples.push({
          type: payload.type,
          preview: String(payload.content || payload.response || '').slice(0, 120),
        });
      }
      if (payload.type === 'done') donePayload = payload;
    });
  }

  const tail = decoder.decode();
  if (tail) {
    buffer += tail;
    buffer = parseSseChunk(buffer, (payload) => {
      eventTypes.push(payload.type || 'unknown');
      if (samples.length < 8) {
        samples.push({
          type: payload.type,
          preview: String(payload.content || payload.response || '').slice(0, 120),
        });
      }
      if (payload.type === 'done') donePayload = payload;
    });
  }

  const uniqueTypes = [...new Set(eventTypes)];
  console.log('STREAM_ENDPOINT_OK', JSON.stringify({
    backend: BACKEND_BASE_URL,
    agentId: agent.id,
    userId: user.id,
    uniqueEventTypes: uniqueTypes,
    sampleEvents: samples,
    hasDone: Boolean(donePayload),
    doneStatus: donePayload?.status || null,
  }));
}

try {
  await main();
} catch (err) {
  console.error('STREAM_ENDPOINT_FAIL', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

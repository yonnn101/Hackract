import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';
import prisma from '../src/database/prismaClient.js';

const BACKEND = process.env.BACKEND_BASE_URL || 'http://localhost:4001';
const SOCKET_URL = process.env.SOCKET_URL || BACKEND;

async function ensureUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `agent-test+${Date.now()}@local`,
        handle: `agenttest${Date.now()}`,
        fullName: 'Agent Test',
        status: 'ACTIVE'
      }
    });
    console.log('Created test user', user.id);
  } else {
    console.log('Using existing user', user.id);
  }
  return user;
}

async function main() {
  try {
    const user = await ensureUser();
    const token = jwt.sign({ sub: user.id }, process.env.JWT_ACCESS_SECRET || 'no-secret');
    console.log('Signed token for user', user.id);

    // Create agent session using fetch
    const createRes = await fetch(`${BACKEND}/api/v1/ai-agents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      console.error('Create agent failed', createRes.status, body);
      throw new Error('Failed to create agent');
    }
    const agent = await createRes.json();
    console.log('Created agent session', agent.id);

    // Connect socket
    const socket = io(`${SOCKET_URL}/ai-agent`, {
      transports: ['websocket'],
      query: { sessionId: agent.id },
      auth: { token },
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socket.on('connect', () => {
      console.log('[test-client] connected', socket.id);
      setTimeout(() => {
        const payload = { message: 'Hello from automated test client' };
        console.log('[test-client] emitting message', payload);
        socket.emit('message', payload);
        socket.emit('agent-message', payload);
      }, 250);
    });

    socket.on('agent-event', (payload) => {
      console.log('[test-client] agent-event', payload);
    });

    socket.on('connect_error', (err) => {
      console.error('[test-client] connect_error', err.message || err);
    });

    socket.on('disconnect', (reason) => {
      console.log('[test-client] disconnected', reason);
      setTimeout(() => process.exit(0), 500);
    });

    // Timeout after 60s
    setTimeout(() => {
      console.log('Test timeout - disconnecting');
      socket.disconnect();
    }, 60000);

  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  }
}

main();

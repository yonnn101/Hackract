import { io } from '../../Frontend/node_modules/socket.io-client/build/esm/index.js';

const socket = io('http://localhost:4000/terminal', {
  query: { workflowId: 'a26ef75f-180b-4b2b-836f-600500807a5b' },
  transports: ['websocket']
});

console.log('Connecting to Socket.io /terminal...');

socket.on('connect', () => {
  console.log('✅ Connected successfully!');
  
  // Wait a moment, send a command, print output
  setTimeout(() => {
    console.log('Sending command: ls');
    socket.emit('input', 'ls\r');
  }, 2000);
});

socket.on('output', (data) => {
  console.log('[OUTPUT]:', data);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

// Auto-exit after 10 seconds to avoid hanging the task
setTimeout(() => {
  console.log('Timing out, test finished.');
  socket.disconnect();
  process.exit(0);
}, 10000);

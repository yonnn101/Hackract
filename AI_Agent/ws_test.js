const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:8008/ws/test-debug-' + Date.now());
let msgCount = 0;

ws.on('open', () => {
  console.log('--- CONNECTED ---');
  console.log('Sending test message...\n');
  ws.send(JSON.stringify({ type: 'message', message: 'what is 2+2' }));
});

ws.on('message', (raw) => {
  msgCount++;
  try {
    const data = JSON.parse(raw.toString());
    const preview = (data.content || '').slice(0, 120).replace(/\n/g, '\\n');
    const metaKeys = data.meta ? Object.keys(data.meta).join(',') : '-';
    console.log(`[${msgCount}] type="${data.type}" meta_keys=[${metaKeys}] content="${preview}${(data.content||'').length > 120 ? '...' : ''}"`);
    
    if (data.type === 'response' || data.type === 'error') {
      console.log('\n--- DONE ---');
      console.log(`Total messages received: ${msgCount}`);
      setTimeout(() => { ws.close(); process.exit(0); }, 500);
    }
  } catch (e) {
    console.log(`[${msgCount}] RAW: ${raw.toString().slice(0, 200)}`);
  }
});

ws.on('error', (err) => { console.error('WS Error:', err.message); process.exit(1); });
ws.on('close', () => { console.log('--- CLOSED ---'); process.exit(0); });

setTimeout(() => { console.log('\n--- TIMEOUT (60s) ---'); ws.close(); process.exit(0); }, 60000);

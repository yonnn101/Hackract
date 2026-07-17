import { checkAgentHealth, sendAgentMessage } from '../src/modules/AiAgent/agent.proxy.js';

const sessionId = `smoke-${Date.now()}`;

try {
  const health = await checkAgentHealth();
  console.log('HEALTH_OK', JSON.stringify(health));

  const result = await sendAgentMessage(sessionId, 'Reply with exactly: PROXY_OK');
  console.log('MESSAGE_OK', JSON.stringify({
    session_id: result.session_id,
    hasResponse: Boolean(result.response),
    responsePreview: (result.response || '').slice(0, 120),
  }));
} catch (err) {
  console.error('PROXY_FAIL', err.message);
  process.exit(1);
}

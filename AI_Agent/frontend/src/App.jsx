import { useState, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import ChatView from './components/ChatView';
import SettingsPanel from './components/Settings/SettingsPanel';
import StepModal from './components/ProcessGroup/StepModal';
import useWebSocket from './hooks/useWebSocket';
import useChat from './hooks/useChat';
import useSettings from './hooks/useSettings';

function getSessionId() {
  let id = sessionStorage.getItem('hackract_session');
  if (!id) {
    id = crypto.randomUUID?.() || String(Date.now());
    sessionStorage.setItem('hackract_session', id);
  }
  return id;
}

export default function App() {
  const sessionId = useMemo(getSessionId, []);
  const [view, setView] = useState('chat');
  const [modalStep, setModalStep] = useState(null);

  const chat = useChat(sessionId);
  const settingsHook = useSettings();

  const handleWsMessage = useCallback((data) => {
    chat.handleWsMessage(data);
  }, [chat.handleWsMessage]);

  const ws = useWebSocket(sessionId, handleWsMessage);

  const handleSend = useCallback((msg) => {
    chat.submitUserMessage(msg);
    ws.send(msg);
  }, [chat.submitUserMessage, ws.send]);

  const handleStop = useCallback(() => {
    ws.stop();
    chat.setProcessing(false);
  }, [ws.stop, chat.setProcessing]);

  return (
    <Layout
      status={ws.status}
      view={view}
      onOpenChat={() => setView('chat')}
      onOpenSettings={() => setView('settings')}
      onNewChat={() => {
        chat.clearChat();
        setView('chat');
      }}
    >
      {view === 'settings' ? (
        <SettingsPanel hook={settingsHook} onBack={() => setView('chat')} showSidebarNav />
      ) : (
        <ChatView
          messages={chat.messages}
          groups={chat.groups}
          processing={chat.processing}
          onSend={handleSend}
          onStop={handleStop}
          onToggleGroup={chat.toggleGroupCollapsed}
          onStepClick={setModalStep}
        />
      )}
      {modalStep && <StepModal step={modalStep} onClose={() => setModalStep(null)} />}
    </Layout>
  );
}

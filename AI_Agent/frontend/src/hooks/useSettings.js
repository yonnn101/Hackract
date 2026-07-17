import { useState, useCallback } from 'react';

const API = '';

export default function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/settings`);
      const data = await r.json();
      setSettings(data);
    } catch (e) {
      showAlert('error', 'Failed to load settings: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (values) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await r.json();
      if (r.ok) {
        showAlert('success', 'Settings saved successfully!');
        setSettings(data.settings || values);
      } else {
        showAlert('error', data.detail || 'Failed to save settings');
      }
    } catch (e) {
      showAlert('error', 'Failed to save: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (values) => {
    try {
      const r = await fetch(`${API}/api/test_connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await r.json();
      const ok = r.ok && (data.success || data.status === 'success');
      if (ok) {
        const msg = data.response || data.message || data.model_used || 'connected';
        showAlert('success', `Connection OK: ${typeof msg === 'string' ? msg.slice(0, 120) : 'OK'}`);
      } else {
        showAlert('error', data.error || data.detail || 'Connection failed');
      }
    } catch (e) {
      showAlert('error', 'Test failed: ' + e.message);
    }
  }, []);

  const clearMemories = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/memory/clear`, { method: 'POST' });
      const data = await r.json();
      showAlert(r.ok ? 'success' : 'error', data.message || data.detail || 'Done');
    } catch (e) {
      showAlert('error', e.message);
    }
  }, []);

  return { settings, loading, alert, load, save, testConnection, clearMemories };
}

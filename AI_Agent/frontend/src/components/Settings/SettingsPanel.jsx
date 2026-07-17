import { useEffect, useState } from 'react';

const LLM_PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'github', label: 'GitHub Models' },
  { value: 'nvidia_nim', label: 'NVIDIA NIM' },
  { value: 'gemini', label: 'Google (Gemini)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'ollama', label: 'Ollama (local)' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'other', label: 'Other (OpenAI compatible)' },
];

export default function SettingsPanel({ hook, onBack, showSidebarNav }) {
  const { settings, loading, alert, load, save, testConnection, clearMemories } = hook;
  const [form, setForm] = useState(null);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (settings) {
      setForm({
        ...settings,
        api_key: '',
        collection_name: settings.collection_name ?? settings.memory_collection ?? '',
      });
    }
  }, [settings]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const isGithub = form?.llm_provider === 'github';
  const isNvidia = form?.llm_provider === 'nvidia_nim';

  if (!form) {
    return (
      <div className="settings-view settings-view--loading">
        <span className="spinner" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="settings-view">
      <div className="settings-header">
        {!showSidebarNav && (
          <button type="button" className="btn-icon btn-ghost" onClick={onBack}>&larr; Back</button>
        )}
        <h1 className="settings-page-title">Settings</h1>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="settings-card">
        <h2>LLM configuration</h2>
        <div className="form-group">
          <label>Provider</label>
          <select value={form.llm_provider || ''} onChange={e => set('llm_provider', e.target.value)}>
            <option value="">Select provider...</option>
            {LLM_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{isGithub ? 'GitHub personal access token' : 'API key'}</label>
          <input
            type="password"
            placeholder={isGithub ? 'ghp_… or fine-grained PAT (models:read)' : isNvidia ? 'nvapi-…' : 'sk-…'}
            value={form.api_key || ''}
            onChange={e => set('api_key', e.target.value)}
          />
          {form.api_key_set && !(form.api_key || '').trim() && (
            <div className="form-help">Leave blank to keep your existing key. Last 4: {form.api_key_masked || '****'}</div>
          )}
          {isGithub && (
            <div className="form-help">
              Create a token at GitHub Settings &rarr; Developer settings with access to{' '}
              <strong>GitHub Models</strong>. Models use endpoint{' '}
              <code className="inline-code">models.inference.ai.azure.com</code> via LiteLLM.
            </div>
          )}
          {isNvidia && (
            <div className="form-help">
              Use an NVIDIA API key for NVIDIA NIM hosted models. LiteLLM routes these through the{' '}
              <code className="inline-code">nvidia_nim</code> provider.
            </div>
          )}
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Chat model</label>
            <input
              value={form.chat_model || ''}
              onChange={e => set('chat_model', e.target.value)}
              placeholder={isGithub ? 'gpt-4o' : 'e.g. claude-sonnet-4-20250514'}
            />
          </div>
          <div className="form-group">
            <label>Utility model</label>
            <input
              value={form.utility_model || ''}
              onChange={e => set('utility_model', e.target.value)}
              placeholder={isGithub ? 'gpt-4o-mini' : 'Smaller / faster model'}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Custom endpoint (optional)</label>
          <input
            value={form.custom_endpoint || ''}
            onChange={e => set('custom_endpoint', e.target.value)}
            placeholder={isGithub ? 'Leave empty for GitHub Models' : 'https://api.openai.com/v1'}
          />
          <div className="form-help">Ollama, LM Studio, or other OpenAI-compatible base URL</div>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => testConnection({
            llm_provider: form.llm_provider,
            api_key: (form.api_key || '').trim(),
            chat_model: form.chat_model,
            custom_endpoint: form.custom_endpoint || '',
          })}
          disabled={loading}
        >
          {loading ? <><span className="spinner" />Testing...</> : 'Test connection'}
        </button>
      </div>

      <div className="settings-card">
        <h2>Generation</h2>
        <div className="grid-2">
          <div className="form-group">
            <label>Temperature</label>
            <input type="number" step="0.05" min="0" max="2" value={form.temperature ?? 0.1} onChange={e => set('temperature', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Max tokens</label>
            <input type="number" step="256" min="256" value={form.max_tokens ?? 4096} onChange={e => set('max_tokens', parseInt(e.target.value, 10))} />
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2>Memory (RAG)</h2>
        <div className="toggle-container">
          <label>Enable memory</label>
          <label className="toggle-switch">
            <input type="checkbox" checked={!!form.memory_enabled} onChange={e => set('memory_enabled', e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        {form.memory_enabled && (
          <>
            <div className="grid-2">
              <div className="form-group">
                <label>Collection</label>
                <input value={form.collection_name || ''} onChange={e => set('collection_name', e.target.value)} placeholder="hackract_memory" />
              </div>
              <div className="form-group">
                <label>Embedding model</label>
                <input value={form.embedding_model || ''} onChange={e => set('embedding_model', e.target.value)} placeholder="text-embedding-3-small" />
              </div>
            </div>
            <div className="settings-inline-actions">
              <button type="button" className="btn-secondary" onClick={clearMemories}>Clear all memories</button>
              <a href="/api/memory/list" target="_blank" rel="noopener noreferrer" className="btn-secondary btn-link">Browse memories</a>
            </div>
          </>
        )}
      </div>

      <button type="button" className="btn-primary" onClick={() => save(form)} disabled={loading}>
        {loading ? <><span className="spinner" />Saving...</> : 'Save settings'}
      </button>
    </div>
  );
}

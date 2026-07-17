import { useState, useRef } from 'react';

export default function Composer({ processing, onSend, onStop }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  const submit = () => {
    const msg = text.trim();
    if (!msg || processing) return;
    onSend(msg);
    setText('');
    ref.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer">
      <textarea
        ref={ref}
        className="composer-input"
        rows={1}
        placeholder="Message HackrAct…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={processing}
      />
      {processing ? (
        <button className="btn-stop" onClick={onStop} title="Stop">&#9632;</button>
      ) : (
        <button className="btn-send" onClick={submit} disabled={!text.trim()} title="Send">&#9654;</button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { askAI } from './api/client';

/* The Spring + Ollama chat service (/api/chat) was fully deployed but never
   surfaced anywhere in the frontend. This page wires it up. */
export default function Assistant() {
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = async (ev) => {
    ev.preventDefault();
    const mine = prompt.trim();
    if (!mine || busy) return;
    setChat((c) => [...c, { who: 'me', text: mine }]);
    setPrompt('');
    setBusy(true);
    setError('');
    const { data, error: err } = await askAI(mine);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setChat((c) => [...c, { who: 'ai', text: data.response }]);
  };

  return (
    <div>
      <div className="head">
        <h1>Ask Lema AI</h1>
        <p>Powered by the on-server AI model — ask about prices, budgeting or farming advice.</p>
      </div>
      <div className="panel chat-panel">
        <div className="chat-log">
          {!chat.length && <p className="muted">Try: "How can I cut my fertiliser costs this season?"</p>}
          {chat.map((m, i) => (
            <p key={i} className={'bubble ' + m.who}>
              {m.text}
            </p>
          ))}
          {busy && <p className="bubble ai">Thinking…</p>}
        </div>
        {error && <p className="error-text">Could not reach the AI service: {error}</p>}
        <form onSubmit={ask} className="chat-form">
          <input placeholder="Ask a question…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button className="btn" disabled={busy}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { askAI } from './api/client';

// Builds a short, real summary of the farmer's own numbers so the AI's
// answers are grounded instead of generic. Only the last 3 months matter.
function buildFarmContext(entries) {
  if (!entries?.length) return undefined;
  const byMonth = {};
  for (const e of entries) {
    byMonth[e.month] ??= { sales: 0, expenses: 0 };
    if (e.type === 'sale') byMonth[e.month].sales += e.amount;
    else byMonth[e.month].expenses += e.amount;
  }
  const months = Object.keys(byMonth).sort().slice(-3);
  if (!months.length) return undefined;
  const totals = months.reduce(
    (acc, m) => ({ sales: acc.sales + byMonth[m].sales, expenses: acc.expenses + byMonth[m].expenses }),
    { sales: 0, expenses: 0 },
  );
  const byCategory = {};
  for (const e of entries) {
    if (e.type !== 'expense') continue;
    byCategory[e.category || 'general'] = (byCategory[e.category || 'general'] || 0) + e.amount;
  }
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const parts = [
    `Over the last ${months.length} month(s): R${totals.sales} in sales, R${totals.expenses} in expenses, profit R${totals.sales - totals.expenses}.`,
  ];
  if (topCategory) parts.push(`Biggest expense category: ${topCategory[0]} (R${topCategory[1]}).`);
  return parts.join(' ');
}

/* The Spring + Ollama chat service (/api/chat) was fully deployed but never
   surfaced anywhere in the frontend. This page wires it up. */
export default function Assistant({ entries }) {
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
    const { data, error: err } = await askAI(mine, buildFarmContext(entries));
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

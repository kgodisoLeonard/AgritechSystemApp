import { useState } from 'react';
import { askAI, getFarmerAnomalies, getFarmerClusters, getNearestFarmers } from './api/client';
import { buildFarmContext } from './farmContext';

export default function Assistant({ entries }) {
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedPrompt, setFailedPrompt] = useState('');
  const [clusters, setClusters] = useState(null);
  const [farmerId, setFarmerId] = useState('');
  const [nearest, setNearest] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [analyticsBusy, setAnalyticsBusy] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');

  const sendPrompt = async (mine, retry = false) => {
    if (!mine || busy) return;
    if (!retry) {
      setChat((c) => [...c, { who: 'me', text: mine }]);
      setPrompt('');
    }
    setBusy(true);
    setError('');
    setFailedPrompt('');
    const { data, error: err } = await askAI(mine, buildFarmContext(entries));
    setBusy(false);
    if (err) {
      setError(err);
      setFailedPrompt(mine);
      return;
    }
    setChat((c) => [...c, { who: 'ai', text: data.response, model: data.model, sources: data.sources }]);
  };

  const ask = (ev) => {
    ev.preventDefault();
    return sendPrompt(prompt.trim());
  };

  const loadClusters = async () => {
    setAnalyticsBusy('clusters');
    setAnalyticsError('');
    const { data, error: err } = await getFarmerClusters(3);
    setAnalyticsBusy('');
    if (err) {
      setAnalyticsError(err);
      return;
    }
    setClusters(data);
  };

  const loadFarmerSignals = async (ev) => {
    ev.preventDefault();
    const id = farmerId.trim();
    if (!id) return;
    setAnalyticsBusy('farmer');
    setAnalyticsError('');
    const [matchResult, anomalyResult] = await Promise.all([
      getNearestFarmers(id, 5),
      getFarmerAnomalies(id),
    ]);
    setAnalyticsBusy('');
    if (matchResult.error || anomalyResult.error) {
      setAnalyticsError(matchResult.error || anomalyResult.error);
      return;
    }
    setNearest(matchResult.data);
    setAnomalies(anomalyResult.data);
  };

  return (
    <div>
      <div className="head">
        <h1>Ask Lema AI</h1>
        <p>Powered by the on-server AI model. Ask about prices, budgeting or farming advice.</p>
      </div>

      <div className="panel chat-panel">
        <div className="chat-log" role="log" aria-live="polite" aria-busy={busy}>
          {!chat.length && <p className="muted">Try: "How can I cut my fertiliser costs this season?"</p>}
          {chat.map((m, i) => (
            <p key={i} className={'bubble ' + m.who}>
              {m.text}
              {m.model && <small className="muted">{m.model}</small>}
              {m.sources?.length > 0 && <small className="muted">Sources: {m.sources.map((s) => s.title).join('; ')}</small>}
            </p>
          ))}
          {busy && <p className="bubble ai">Thinking...</p>}
        </div>
        {error && <p className="error-text">Could not reach the AI service: {error}</p>}
        {failedPrompt && <button className="btn" type="button" onClick={() => sendPrompt(failedPrompt, true)} disabled={busy}>Retry</button>}
        <form onSubmit={ask} className="chat-form">
          <input placeholder="Ask a question..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button className="btn" disabled={busy || !prompt.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="grid ai-grid">
        <section className="panel">
          <h3>K-means farmer clustering</h3>
          <p className="muted">Groups farmers by spending, orders and product behavior.</p>
          <button className="btn" onClick={loadClusters} disabled={analyticsBusy === 'clusters'}>
            {analyticsBusy === 'clusters' ? 'Loading...' : 'Load clusters'}
          </button>
          {clusters?.clusters?.length > 0 && (
            <div className="cluster-list">
              {clusters.clusters.map((cluster) => (
                <article key={cluster.clusterId} className="mini">
                  <b>Cluster {cluster.clusterId}</b>
                  <small>{cluster.farmers.length} farmers</small>
                </article>
              ))}
            </div>
          )}
          {clusters && !clusters.clusters?.length && <p className="muted">No farmer records found yet.</p>}
        </section>

        <form className="panel" onSubmit={loadFarmerSignals}>
          <h3>Nearest matching and anomalies</h3>
          <div className="inline-form">
            <input placeholder="Farmer ID" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} />
            <button className="btn" disabled={analyticsBusy === 'farmer'}>
              {analyticsBusy === 'farmer' ? 'Checking...' : 'Check'}
            </button>
          </div>
          {analyticsError && <p className="error-text">{analyticsError}</p>}
          {nearest?.matches?.length > 0 && (
            <section>
              <h3>Nearest farmers</h3>
              <ul className="list">
                {nearest.matches.map((m) => (
                  <li key={m.farmer.farmerId}>
                    <span>{m.farmer.name || m.farmer.farmerId}<small>{m.reasons.join(' / ')}</small></span>
                    <b>{Math.round(m.similarity * 100)}%</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {anomalies?.anomalies?.length > 0 && (
            <section>
              <h3>Anomalies</h3>
              <ul className="list">
                {anomalies.anomalies.map((a) => (
                  <li key={`${a.type}-${a.metric}`}>
                    <span>{a.message}<small>{a.metric}: {a.value}</small></span>
                    <b className={a.severity === 'high' ? 'neg' : ''}>{a.severity}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {nearest && !nearest.matches?.length && <p className="muted">No nearby farmer matches found.</p>}
          {anomalies && !anomalies.anomalies?.length && <p className="muted">No unusual signals found.</p>}
        </form>
      </div>
    </div>
  );
}

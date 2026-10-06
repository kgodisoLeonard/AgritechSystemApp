import { useState } from 'react';
import { askAI, getFarmerAnomalies, getFarmerClusters, getNearestFarmers } from './api/client';
import { buildFarmContext } from './farmContext';
import { ownBuyingGroup, hasRecordedActivity, matchReason, spendingAlert } from './farmerInsights';

export default function Assistant({ entries, farmerId }) {
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedPrompt, setFailedPrompt] = useState('');
  const [clusters, setClusters] = useState(null);
  const [nearest, setNearest] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [matchesBusy, setMatchesBusy] = useState(false);
  const [alertsBusy, setAlertsBusy] = useState(false);
  const [matchesError, setMatchesError] = useState('');
  const [alertsError, setAlertsError] = useState('');
  const group = ownBuyingGroup(clusters, farmerId);
  const profile = nearest?.farmer || group?.farmer;

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
    if (farmerId == null || matchesBusy) return;
    setMatchesBusy(true);
    setMatchesError('');
    const [groupResult, matchResult] = await Promise.all([
      getFarmerClusters(3), getNearestFarmers(farmerId, 5),
    ]);
    setMatchesBusy(false);
    setClusters(groupResult.data || null);
    setNearest(matchResult.data || null);
    setMatchesError(groupResult.error || matchResult.error || '');
  };

  const loadFarmerSignals = async () => {
    if (farmerId == null || alertsBusy) return;
    setAlertsBusy(true);
    setAlertsError('');
    const result = await getFarmerAnomalies(farmerId);
    setAlertsBusy(false);
    setAnomalies(result.data || null);
    setAlertsError(result.error || '');
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
        <section className="farmer-insights" aria-busy={matchesBusy}>
          <h2>Similar farmers</h2>
          <button className="btn" onClick={loadClusters} disabled={matchesBusy || farmerId == null}>
            {matchesBusy ? 'Finding matches...' : 'Find similar farmers'}
          </button>
          {matchesError && <p className="error-text" role="alert">Could not load all farmer matches: {matchesError}</p>}
          {profile && !hasRecordedActivity(profile) && <p className="muted">Not enough recorded activity yet. Add farm expenses or join a group order before comparing your farm.</p>}
          {hasRecordedActivity(profile) && group && <p className="group-summary">
            {group.others > 0
              ? `${group.others} other ${group.others === 1 ? 'farmer has' : 'farmers have'} a spending and buying pattern like yours.`
              : 'No other farmers are in your spending and buying group yet.'}
          </p>}
          {hasRecordedActivity(profile) && nearest?.matches?.length > 0 && (
              <ul className="list">
                {nearest.matches.map((m, index) => (
                  <li key={m.farmer.farmerId}>
                    <span><b>{m.farmer.name || `Farmer match ${index + 1}`}</b><small>{(m.reasons || []).map(matchReason).join('; ')}</small></span>
                  </li>
                ))}
              </ul>
          )}
          {hasRecordedActivity(profile) && nearest && !nearest.matches?.length && <p className="muted">No other farmers are available to compare yet.</p>}
          {clusters && !clusters.clusters?.length && <p className="muted">No recorded farmer activity is available yet.</p>}
        </section>

        <section className="farmer-insights" aria-busy={alertsBusy}>
          <h2>Spending alerts</h2>
          <button className="btn" onClick={loadFarmerSignals} disabled={alertsBusy || farmerId == null}>
            {alertsBusy ? 'Checking your records...' : 'Check my spending'}
          </button>
          {alertsError && <p className="error-text" role="alert">Could not check your spending: {alertsError}</p>}
          {anomalies?.anomalies?.length > 0 && (
              <ul className="list">
                {anomalies.anomalies.map((a) => {
                  const alert = spendingAlert(a);
                  return <li key={`${a.type}-${a.metric}`}>
                    <span><b>{alert.title}</b><small>{alert.comparison}</small><small>{alert.action}</small></span>
                  </li>;
                })}
              </ul>
          )}
          {anomalies && !anomalies.anomalies?.length && <p className="muted">{hasRecordedActivity(anomalies.farmer)
            ? 'No spending alerts found in your recorded activity.'
            : 'No spending or order records to check yet.'}</p>}
        </section>
      </div>
    </div>
  );
}

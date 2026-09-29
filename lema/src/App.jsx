import { useEffect, useMemo, useState } from 'react';
import { logEntry, getGroups, joinGroup, getSuppliers } from './api/client';
import { TIERS, seedEntries, seedGroups, seedSuppliers } from './data';

const R = (n) => 'R ' + Math.round(n).toLocaleString('en-ZA');
const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep'];
const discountFor = (n) => [...TIERS].reverse().find((t) => n >= t.at)?.off ?? 0;

/* ---------- Ledger ---------- */
function Chart({ entries }) {
  const rows = MONTHS.map((m) => ({
    m,
    inc: entries.filter((e) => e.month === m && e.type === 'sale').reduce((a, e) => a + e.amount, 0),
    exp: entries.filter((e) => e.month === m && e.type === 'expense').reduce((a, e) => a + e.amount, 0),
  }));
  const max = Math.max(...rows.flatMap((r) => [r.inc, r.exp]), 1);
  return (
    <svg viewBox="0 0 400 180" className="chart" role="img" aria-label="Sales and expenses per month">
      {rows.map((r, i) => {
        const x = 20 + i * 76;
        const h1 = (r.inc / max) * 130, h2 = (r.exp / max) * 130;
        return (
          <g key={r.m}>
            <rect x={x} y={150 - h1} width="26" height={h1} rx="4" fill="var(--maize)" />
            <rect x={x + 30} y={150 - h2} width="26" height={h2} rx="4" fill="var(--soil)" />
            <text x={x + 28} y="170" textAnchor="middle" fontSize="12" fill="currentColor">{r.m}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LoanMeter({ entries }) {
  const good = MONTHS.filter((m) => {
    const s = entries.filter((e) => e.month === m && e.type === 'sale').reduce((a, e) => a + e.amount, 0);
    const x = entries.filter((e) => e.month === m && e.type === 'expense').reduce((a, e) => a + e.amount, 0);
    return s > x;
  }).length;
  const score = Math.min(100, good * 14 + Math.min(entries.length, 15) * 2);
  const label = score >= 80 ? 'Ready to show a lender' : score >= 50 ? 'Getting there' : 'Keep logging';
  return (
    <div className="panel meter">
      <h3>Loan readiness</h3>
      <div className="ring" style={{ '--p': score }}><b>{score}</b></div>
      <p><strong>{label}</strong><br />{good} of {MONTHS.length} months profitable. Lenders want at least 6 months of records.</p>
    </div>
  );
}

function Ledger({ entries, onAdd }) {
  const [f, setF] = useState({ type: 'expense', item: '', amount: '', location: 'Polokwane' });
  const sales = entries.filter((e) => e.type === 'sale').reduce((a, e) => a + e.amount, 0);
  const costs = entries.filter((e) => e.type === 'expense').reduce((a, e) => a + e.amount, 0);
  const submit = (ev) => {
    ev.preventDefault();
    onAdd({ ...f, amount: Number(f.amount), month: 'Sep' });
    setF({ ...f, item: '', amount: '' });
  };
  return (
    <div className="grid ledger">
      <section className="hero">
        <p className="hello">Farm profit since May</p>
        <h1 className={sales - costs >= 0 ? 'pos' : 'neg'}>{R(sales - costs)}</h1>
        <p>You sold {R(sales)} and spent {R(costs)}. Every entry is backed up to your account, so a lost notebook does not cost you your history.</p>
        <Chart entries={entries} />
        <p className="legend"><i className="dot m" /> Sales <i className="dot s" /> Expenses</p>
      </section>
      <LoanMeter entries={entries} />
      <form className="panel" onSubmit={submit}>
        <h3>Log an entry</h3>
        <div className="seg">
          {['expense', 'sale'].map((t) => (
            <button type="button" key={t} className={f.type === t ? 'on' : ''} onClick={() => setF({ ...f, type: t })}>
              {t === 'expense' ? 'I spent' : 'I sold'}
            </button>
          ))}
        </div>
        <input required placeholder="What (e.g. LAN fertiliser, 20 bags)" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} />
        <input required type="number" min="1" placeholder="Amount in Rand" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <input required placeholder="Town" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        <button className="btn">Save entry</button>
      </form>
      <section className="panel wide">
        <h3>Recent entries</h3>
        <ul className="list">
          {[...entries].reverse().slice(0, 6).map((e) => (
            <li key={e.id}>
              <span>{e.item}<small>{e.month} · {e.location}</small></span>
              <b className={e.type === 'sale' ? 'pos' : 'neg'}>{e.type === 'sale' ? '+' : '-'}{R(e.amount)}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Group buying ---------- */
function Silo({ n }) {
  const max = TIERS[2].at;
  const h = Math.min(n / max, 1) * 150;
  return (
    <svg viewBox="0 0 120 190" className="silo" role="img" aria-label={`${n} farmers in the pool`}>
      <defs><clipPath id={'c' + n}><rect x="20" y="20" width="60" height="150" rx="10" /></clipPath></defs>
      <rect x="20" y="20" width="60" height="150" rx="10" fill="var(--sky)" />
      <g clipPath={`url(#c${n})`}><rect x="20" y={170 - h} width="60" height={h} fill="var(--maize)" className="grain" /></g>
      {TIERS.map((t) => {
        const y = 170 - (t.at / max) * 150;
        return (
          <g key={t.at}>
            <line x1="14" x2="86" y1={y} y2={y} stroke="var(--forest)" strokeDasharray="3 3" />
            <text x="92" y={y + 4} fontSize="11" fill="var(--forest)" fontWeight="700">{t.off}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function Groups({ groups, joined, onJoin }) {
  return (
    <div>
      <div className="head">
        <h1>Buy together, pay less</h1>
        <p>We match farmers near you who need the same input at the same time. Join a pool and everyone buys from one supplier at the bulk price. You pay the supplier directly.</p>
      </div>
      <div className="grid pools">
        {groups.map((g) => {
          const n = g.memberCount + (joined.includes(g.id) ? 1 : 0);
          const off = discountFor(n);
          const next = TIERS.find((t) => n < t.at);
          const price = g.price * (1 - off / 100);
          return (
            <article className="panel pool" key={g.id}>
              <Silo n={n} />
              <div>
                <h3>{g.inputName}</h3>
                <p className="muted">{g.supplierName} · {g.area}</p>
                <p className="why">{g.reason}</p>
                <p className="price"><s>{R(g.price)}</s> <b>{R(price)}</b> each</p>
                <p className="muted">{n} farmers in · {off ? `${off}% off unlocked` : 'no discount yet'}{next ? ` · ${next.at - n} more for ${next.off}%` : ' · best tier reached'}</p>
                <button className={'btn' + (joined.includes(g.id) ? ' done' : '')} disabled={joined.includes(g.id)} onClick={() => onJoin(g.id)}>
                  {joined.includes(g.id) ? 'You are in this pool' : 'Join this pool'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Suppliers ---------- */
function Suppliers({ suppliers }) {
  const [q, setQ] = useState('');
  const shown = suppliers.filter((s) => (s.name + s.area + s.stock.join()).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="head">
        <h1>Suppliers we have checked</h1>
        <p>Local agri-stores and co-ops, added by hand. You agree payment and delivery or pickup with them directly.</p>
        <input className="search" placeholder="Search by name, town or product" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid sup">
        {shown.map((s) => (
          <article className="panel" key={s.id}>
            <h3>{s.name}</h3>
            <p className="muted">{s.type} · {s.area}</p>
            <p className="tags">{s.stock.map((t) => <span key={t}>{t}</span>)}</p>
            <p><b>{s.phone}</b></p>
            <p className={'status ' + (s.open ? 'ok' : '')}>{s.open ? 'Gets pool alerts in your area' : 'Not yet taking pool orders'}</p>
          </article>
        ))}
        {!shown.length && <p className="muted">No supplier matches "{q}". Try a nearby town.</p>}
      </div>
    </div>
  );
}

/* ---------- Shell ---------- */
export default function App() {
  const [tab, setTab] = useState('ledger');
  const [entries, setEntries] = useState(() => JSON.parse(localStorage.getItem('lema.entries') || 'null') || seedEntries);
  const [groups, setGroups] = useState(seedGroups);
  const [suppliers, setSuppliers] = useState(seedSuppliers);
  const [joined, setJoined] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => { getGroups(seedGroups).then((g) => Array.isArray(g) && setGroups(g)); getSuppliers(seedSuppliers).then((s) => Array.isArray(s) && setSuppliers(s)); }, []);
  useEffect(() => localStorage.setItem('lema.entries', JSON.stringify(entries)), [entries]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); } }, [toast]);

  const add = async (e) => {
    const entry = { ...e, id: Date.now(), farmerId: 1 };
    setEntries((p) => [...p, entry]);
    await logEntry(entry);
    setToast(e.type === 'expense' ? 'Saved. Checking for farmers buying the same input near you.' : 'Sale saved.');
  };
  const join = async (id) => { setJoined((p) => [...p, id]); await joinGroup(id, 1); setToast('You joined the pool. The supplier is told when it fills.'); };

  const tabs = useMemo(() => [['ledger', 'My farm'], ['groups', 'Group buying'], ['suppliers', 'Suppliers']], []);
  return (
    <>
      <header className="bar">
        <div className="logo"><span className="mark" />Lema</div>
        <nav>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav>
      </header>
      <main>
        {tab === 'ledger' && <Ledger entries={entries} onAdd={add} />}
        {tab === 'groups' && <Groups groups={groups} joined={joined} onJoin={join} />}
        {tab === 'suppliers' && <Suppliers suppliers={suppliers} />}
      </main>
      <footer>Lema · Records backed up · Payment and delivery happen between you and the supplier</footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

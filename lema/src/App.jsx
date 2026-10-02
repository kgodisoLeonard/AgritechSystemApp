import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, NavLink } from 'react-router-dom';
import {
  getExpenses, addExpense, getIncome, addIncome,
  getSuppliers, getProducts, getGroupOrders, joinGroupOrder,
  getRecommendations, getNotifications,
} from './api/client';
import { Home, HowItWorks, ForSuppliers } from './pages';
import Auth from './Auth';
import Assistant from './Assistant';

const R = (n) => 'R ' + Math.round(n).toLocaleString('en-ZA');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round2 = (n) => Math.round(n * 100) / 100;

// Last `n` calendar months ending this month, e.g. ['May','Jun','Jul','Aug','Sep'].
function recentMonths(n = 5) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(MONTH_NAMES[d.getMonth()]);
  }
  return out;
}
const monthOf = (dateStr) => MONTH_NAMES[new Date(dateStr).getMonth()];

/* ---------- Ledger ---------- */
function Chart({ entries, months }) {
  const rows = months.map((m) => ({
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

function LoanMeter({ entries, months }) {
  const good = months.filter((m) => {
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
      <p><strong>{label}</strong><br />{good} of {months.length} months profitable. Lenders want at least 6 months of records.</p>
    </div>
  );
}

function Insights({ farmerId, refreshKey }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let live = true;
    getRecommendations(farmerId).then(({ data }) => { if (live) setItems(Array.isArray(data) ? data : []); });
    return () => { live = false; };
  }, [farmerId, refreshKey]);
  return (
    <div className="panel insights">
      <h3>AI insights</h3>
      {items === null && <p className="muted">Loading…</p>}
      {items && items.length === 0 && (
        <p className="muted">Keep logging — Lema will start spotting patterns after a few entries.</p>
      )}
      {items && items.map((r) => (
        <p key={r.id} className="insight-row">{r.reason}</p>
      ))}
    </div>
  );
}

function Ledger({ entries, onAdd, busy, error, farmerId, months, recoRefreshKey }) {
  const [f, setF] = useState({ type: 'expense', item: '', category: 'general', amount: '', location: '' });
  const sales = entries.filter((e) => e.type === 'sale').reduce((a, e) => a + e.amount, 0);
  const costs = entries.filter((e) => e.type === 'expense').reduce((a, e) => a + e.amount, 0);
  const submit = (ev) => {
    ev.preventDefault();
    onAdd({ ...f, amount: Number(f.amount) });
    setF({ ...f, item: '', amount: '' });
  };
  return (
    <div className="grid ledger">
      <section className="hero">
        <p className="hello">Farm profit so far</p>
        <h1 className={sales - costs >= 0 ? 'pos' : 'neg'}>{R(sales - costs)}</h1>
        <p>You sold {R(sales)} and spent {R(costs)}. Every entry is backed up to your account, so a lost notebook does not cost you your history.</p>
        <Chart entries={entries} months={months} />
        <p className="legend"><i className="dot m" /> Sales <i className="dot s" /> Expenses</p>
      </section>
      <LoanMeter entries={entries} months={months} />
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
        {f.type === 'expense' && (
          <input placeholder="Category (e.g. fertilizer, seeds, labour)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        )}
        <input required type="number" min="1" placeholder="Amount in Rand" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        {error && <p className="error-text">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save entry'}</button>
      </form>
      <Insights farmerId={farmerId} refreshKey={recoRefreshKey} />
      <section className="panel wide">
        <h3>Recent entries</h3>
        {!entries.length && <p className="muted">No entries yet. Log your first sale or expense above.</p>}
        <ul className="list">
          {[...entries].reverse().slice(0, 8).map((e) => (
            <li key={e.id}>
              <span>{e.item}<small>{e.month}{e.category ? ` · ${e.category}` : ''}</small></span>
              <b className={e.type === 'sale' ? 'pos' : 'neg'}>{e.type === 'sale' ? '+' : '-'}{R(e.amount)}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Group buying ---------- */
function Silo({ n, max }) {
  const h = Math.min(n / Math.max(max, 1), 1) * 150;
  return (
    <svg viewBox="0 0 120 190" className="silo" role="img" aria-label={`${n} of ${max} target units filled`}>
      <defs><clipPath id={'c' + n}><rect x="20" y="20" width="60" height="150" rx="10" /></clipPath></defs>
      <rect x="20" y="20" width="60" height="150" rx="10" fill="var(--sky)" />
      <g clipPath={`url(#c${n})`}><rect x="20" y={170 - h} width="60" height={h} fill="var(--maize)" className="grain" /></g>
    </svg>
  );
}

function Groups({ groups, joined, onJoin, busyId, error }) {
  const [qty, setQty] = useState({});
  return (
    <div>
      <div className="head">
        <h1>Buy together, pay less</h1>
        <p>We match farmers near you who need the same input at the same time. Join a pool and everyone buys from one supplier at the bulk price. You pay the supplier directly.</p>
      </div>
      {error && <p className="error-text">{error}</p>}
      {!groups.length && <p className="muted">No group orders are open right now. Check back soon.</p>}
      <div className="grid pools">
        {groups.map((g) => {
          const unit = g.unit_price != null ? Number(g.unit_price) : null;
          const off = Number(g.discount_rate) || 0;
          const discounted = unit != null ? round2(unit * (1 - off / 100)) : null;
          const n = g.current_quantity || 0;
          const target = g.target_quantity || 1;
          const left = Math.max(target - n, 0);
          const q = qty[g.id] ?? 1;
          const already = joined.includes(g.id);
          return (
            <article className="panel pool" key={g.id}>
              <Silo n={n} max={target} />
              <div>
                <h3>{g.product_name}</h3>
                <p className="muted">{g.supplier_name} · {g.supplier_location}</p>
                {unit != null && (
                  <p className="price"><s>{R(unit)}</s> <b>{R(discounted)}</b> each{off ? ` · ${off}% off` : ''}</p>
                )}
                <p className="muted">{n} of {target} units filled{left ? ` · ${left} to go` : ' · full'}{g.status !== 'open' ? ` · ${g.status}` : ''}</p>
                {g.status === 'open' && !already && (
                  <div className="join-row">
                    <input
                      type="number"
                      min="1"
                      max={left || undefined}
                      value={q}
                      onChange={(e) => setQty({ ...qty, [g.id]: Number(e.target.value) })}
                      aria-label="Quantity"
                    />
                    <button
                      className="btn"
                      disabled={busyId === g.id || unit == null}
                      onClick={() => onJoin(g.id, q, round2(discounted * q))}
                    >
                      {busyId === g.id ? 'Joining…' : 'Join this pool'}
                    </button>
                  </div>
                )}
                {already && <button className="btn done" disabled>You are in this pool</button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Suppliers ---------- */
function Suppliers({ suppliers, notifications }) {
  const [q, setQ] = useState('');
  const shown = suppliers.filter((s) => (s.name + s.location + s.stock.join()).toLowerCase().includes(q.toLowerCase()));
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
            <p className="muted">{s.location}</p>
            <p className="tags">{s.stock.map((t) => <span key={t}>{t}</span>)}</p>
            <p><b>{s.contact}</b></p>
            <p className={'status ' + (s.open ? 'ok' : '')}>{s.open ? 'Has an open group order near you' : 'No open pool right now'}</p>
          </article>
        ))}
        {!shown.length && <p className="muted">No supplier matches "{q}". Try a nearby town.</p>}
      </div>
      {!!notifications.length && (
        <section className="panel wide">
          <h3>Recent supplier alerts</h3>
          <ul className="list">
            {notifications.slice(0, 6).map((n) => (
              <li key={n.id}>
                <span>{n.message}<small>{n.supplier_name}</small></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------- Shell ---------- */
function AppShell({ farmer, onLogout, entries, groups, suppliers, notifications, joined, add, join, addBusy, addError, joinBusyId, joinError, months, recoRefreshKey }) {
  const tabs = useMemo(() => [
    ['ledger', 'My farm'],
    ['groups', 'Group buying'],
    ['suppliers', 'Suppliers'],
    ['assistant', 'Ask AI'],
  ], []);
  return (
    <>
      <header className="bar">
        <Link to="/" className="logo"><span className="mark" />Lema</Link>
        <nav>{tabs.map(([k, l]) => (
          <NavLink key={k} to={`/app/${k}`} className={({ isActive }) => (isActive ? 'on' : '')}>{l}</NavLink>
        ))}</nav>
        <button type="button" className="link-btn" onClick={onLogout}>Log out ({farmer.name})</button>
      </header>
      <main>
        <Routes>
          <Route path="ledger" element={<Ledger entries={entries} onAdd={add} busy={addBusy} error={addError} farmerId={farmer.id} months={months} recoRefreshKey={recoRefreshKey} />} />
          <Route path="groups" element={<Groups groups={groups} joined={joined} onJoin={join} busyId={joinBusyId} error={joinError} />} />
          <Route path="suppliers" element={<Suppliers suppliers={suppliers} notifications={notifications} />} />
          <Route path="assistant" element={<Assistant />} />
          <Route index element={<Ledger entries={entries} onAdd={add} busy={addBusy} error={addError} farmerId={farmer.id} months={months} recoRefreshKey={recoRefreshKey} />} />
        </Routes>
      </main>
      <footer>Lema · Records backed up · Payment and delivery happen between you and the supplier</footer>
    </>
  );
}

export default function App() {
  const [farmer, setFarmer] = useState(() => JSON.parse(localStorage.getItem('lema.farmer') || 'null'));
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [joined, setJoined] = useState(() => JSON.parse(localStorage.getItem(`lema.joined.${farmer?.id}`) || '[]'));
  const [toast, setToast] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [joinBusyId, setJoinBusyId] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [recoRefreshKey, setRecoRefreshKey] = useState(0);
  const months = useMemo(() => recentMonths(5), []);

  const onAuthed = (data) => {
    localStorage.setItem('lema.farmer', JSON.stringify(data));
    setFarmer(data);
    setJoined(JSON.parse(localStorage.getItem(`lema.joined.${data.id}`) || '[]'));
  };
  const onLogout = () => {
    localStorage.removeItem('lema.farmer');
    setFarmer(null);
    setEntries([]);
  };

  // Ledger: pull this farmer's real expenses + income from the Node API.
  useEffect(() => {
    if (!farmer) return;
    let live = true;
    Promise.all([getExpenses(farmer.id), getIncome(farmer.id)]).then(([exp, inc]) => {
      if (!live) return;
      const expenses = (exp.data || []).map((e) => ({ ...e, type: 'expense', month: monthOf(e.date) }));
      const income = (inc.data || []).map((e) => ({ ...e, type: 'sale', month: monthOf(e.date) }));
      setEntries([...expenses, ...income].sort((a, b) => new Date(a.date) - new Date(b.date)));
    });
    return () => { live = false; };
  }, [farmer]);

  // Marketplace data is public, so load it regardless of auth state.
  useEffect(() => {
    let live = true;
    Promise.all([getSuppliers(), getProducts(), getGroupOrders(), getNotifications()]).then(
      ([sup, prod, go, notif]) => {
        if (!live) return;
        const suppliersList = sup.data || [];
        const products = prod.data || [];
        const groupOrders = go.data || [];
        const merged = suppliersList.map((s) => ({
          ...s,
          stock: [...new Set(products.filter((p) => p.supplier_name === s.name).map((p) => p.product_name))],
          open: groupOrders.some((g) => g.supplier_name === s.name && g.status === 'open'),
        }));
        setSuppliers(merged);
        setGroups(groupOrders);
        setNotifications(notif.data || []);
      }
    );
    return () => { live = false; };
  }, []);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3800); return () => clearTimeout(t); } }, [toast]);

  const add = async (e) => {
    setAddBusy(true);
    setAddError('');
    const { data, error } =
      e.type === 'expense'
        ? await addExpense(farmer.id, { item: e.item, category: e.category || 'general', amount: e.amount })
        : await addIncome(farmer.id, { item: e.item, amount: e.amount });
    setAddBusy(false);
    if (error) {
      setAddError(error);
      return;
    }
    setEntries((p) => [...p, { ...data, type: e.type, month: monthOf(data.date) }]);
    if (e.type === 'expense') {
      // The backend reclusters farmers by spending pattern synchronously
      // when an expense is saved, so by the time this resolves fresh
      // recommendations may already exist — bump the key to refetch them.
      setRecoRefreshKey((k) => k + 1);
    }
    setToast(e.type === 'expense' ? 'Saved. Checking for farmers buying the same input near you.' : 'Sale saved.');
  };

  const join = async (id, quantity, totalPrice) => {
    setJoinBusyId(id);
    setJoinError('');
    const { error } = await joinGroupOrder(id, { farmerId: farmer.id, quantity, totalPrice });
    setJoinBusyId(null);
    if (error) {
      setJoinError(error);
      return;
    }
    const next = [...joined, id];
    setJoined(next);
    localStorage.setItem(`lema.joined.${farmer.id}`, JSON.stringify(next));
    const { data } = await getGroupOrders();
    if (data) setGroups(data);
    setToast('You joined the pool. The supplier is told when it fills.');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/for-suppliers" element={<ForSuppliers />} />
        <Route
          path="/app/*"
          element={
            farmer ? (
              <AppShell
                farmer={farmer}
                onLogout={onLogout}
                entries={entries}
                groups={groups}
                suppliers={suppliers}
                notifications={notifications}
                joined={joined}
                add={add}
                join={join}
                addBusy={addBusy}
                addError={addError}
                joinBusyId={joinBusyId}
                joinError={joinError}
                months={months}
                recoRefreshKey={recoRefreshKey}
              />
            ) : (
              <Auth onAuthed={onAuthed} />
            )
          }
        />
      </Routes>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

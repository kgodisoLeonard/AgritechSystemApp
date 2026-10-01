import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerFarmer, loginFarmer } from './api/client';

const AUTH_IMG = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80';

/* Gate in front of the authenticated /app/* routes. The backend already has
   full register/login support (Spring + bcrypt) that the frontend never used —
   every farmer was hard-coded to id 1. This makes real accounts work end to end. */
export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', location: '', contact: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: err } =
      mode === 'login'
        ? await loginFarmer({ contact: form.contact, password: form.password })
        : await registerFarmer(form);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onAuthed(data);
  };

  return (
    <div className="auth-split">
      <div className="auth-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(18,59,46,.3), rgba(18,59,46,.92)), url(${AUTH_IMG})` }}>
        <Link to="/" className="logo2 auth-logo">🌾 Lema</Link>
        <div className="auth-visual-copy">
          <span className="pill">Built for small-scale farmers</span>
          <h2>Every entry you log<br /> builds proof you can show a lender.</h2>
          <p>Your ledger, pools and alerts are tied to your own account — not a shared demo.</p>
        </div>
      </div>
      <div className="auth-gate">
        <form className="panel auth-card" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Log in to your farm' : 'Create your farm account'}</h2>
          <p className="muted">Your ledger, pools and alerts are tied to this account — not a shared demo.</p>
          {mode === 'register' && (
            <>
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                placeholder="Town"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </>
          )}
          <input
            required
            placeholder="Phone or email"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <input
            required
            type="password"
            minLength={4}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
          >
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

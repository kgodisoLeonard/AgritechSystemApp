/* Marketing landing page: hero, stats, how-it-works, testimonial, supplier CTA */

const HERO_IMG = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80';
const PLOT_IMG = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=500&q=80';
const CROP_IMG = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=500&q=80';
const FARMER_IMG = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80';

function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4C14 4 6 12 6 22v20h36V22C42 12 34 4 24 4Z" stroke="currentColor" strokeWidth="3" />
      <path d="M24 42V18m0 0c0-6-4-9-8-9m8 9c0-6 4-9 8-9m-8 18c0-5-3-8-6-8m6 8c0-5 3-8 6-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Icon({ name }) {
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'ledger') return <svg {...common}><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5" /></svg>;
  if (name === 'ai') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /></svg>;
  if (name === 'group') return <svg {...common}><circle cx="8" cy="9" r="3" /><circle cx="17" cy="9" r="3" /><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M11 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>;
  return null;
}

export default function Landing({ onLaunch }) {
  return (
    <div className="landing">
      <nav className="nav2">
        <div className="logo2"><Mark /> Lema</div>
        <div className="links2">
          <a href="#how">How it works</a>
          <a href="#suppliers2">For suppliers</a>
          <a href="#app">My farm app</a>
        </div>
        <button className="btn ghost" onClick={onLaunch}>Open the app</button>
      </nav>

      <section className="hero2" style={{ backgroundImage: `linear-gradient(100deg, rgba(18,59,46,.94) 0%, rgba(18,59,46,.74) 40%, rgba(18,59,46,.15) 100%), url(${HERO_IMG})` }}>
        <div className="hero2-content">
          <span className="pill">Built for small-scale farmers</span>
          <h1>Know your numbers.<br />Buy together. <span className="hi">Save more.</span></h1>
          <p>Log every sale and expense in seconds, let Lema's AI spot buying patterns, and get matched with nearby
            farmers ordering the same input — so your whole group unlocks bulk pricing from a trusted local supplier.</p>
          <div className="hero2-cta">
            <button className="btn" onClick={onLaunch}>Start tracking my farm</button>
            <a className="btn outline" href="#how">See how it works</a>
          </div>
          <div className="stats-row">
            <div className="stat"><b>500+</b><span>Farmers onboarded</span></div>
            <div className="stat"><b>35%</b><span>Avg. bulk discount</span></div>
            <div className="stat"><b>40+</b><span>Verified suppliers</span></div>
          </div>
        </div>
      </section>

      <section className="features" id="how">
        <div className="head">
          <h2>From notebook to numbers, in three steps</h2>
          <p>No accountant, no spreadsheets — just an app that watches your money and your market for you.</p>
        </div>
        <div className="grid feat-grid">
          <article className="panel feature">
            <span className="feature-icon"><Icon name="ledger" /></span>
            <h3>1. Log sales &amp; expenses</h3>
            <p>Record what you spend and sell, from any device, any time. Your records are backed up — a lost notebook never costs you your history again.</p>
          </article>
          <article className="panel feature">
            <span className="feature-icon"><Icon name="ai" /></span>
            <h3>2. AI spots the pattern</h3>
            <p>Lema watches what you buy, when, and where — then quietly looks for other farmers near you buying the same input around the same time.</p>
          </article>
          <article className="panel feature">
            <span className="feature-icon"><Icon name="group" /></span>
            <h3>3. Join the group, unlock the price</h3>
            <p>A group forms inside the app. Everyone orders from one matched supplier and unlocks bulk pricing. You pay and collect directly — nothing changes about how you already do business.</p>
          </article>
        </div>
      </section>

      <section className="split">
        <img src={PLOT_IMG} alt="Rows of healthy crops on a small farm" loading="lazy" />
        <div>
          <h2>Finally, proof you can show a lender</h2>
          <p>Six months of honest records is often all a lender wants to see. Lema turns your daily logging into a loan-readiness score, so you know exactly when you're ready to ask — and can back it up.</p>
          <ul className="check">
            <li>Automatic profit &amp; loss, month by month</li>
            <li>A simple readiness score, not confusing statements</li>
            <li>Your data, always backed up to your account</li>
          </ul>
        </div>
      </section>

      <section className="split reverse" id="suppliers2">
        <div>
          <h2>Suppliers get ready buyers, not more paperwork</h2>
          <p>We hand-pick and onboard local agri-stores and co-ops. When a group order forms in your area, you get one simple notification — payment and delivery stay exactly how they already work between you and the farmer.</p>
          <ul className="check">
            <li>A free, simple listing for your business</li>
            <li>Alerted only when real demand is confirmed</li>
            <li>No new payment system to learn</li>
          </ul>
        </div>
        <img src={CROP_IMG} alt="Fresh harvested crops ready for market" loading="lazy" />
      </section>

      <section className="quote">
        <img src={FARMER_IMG} alt="A smiling farmer" />
        <blockquote>
          “I used to guess if I made money this season. Now I can show six months of real numbers — and I bought my
          fertiliser twelve percent cheaper by waiting two days for the group to fill.”
          <cite>— Small-scale maize &amp; vegetable farmer, Limpopo</cite>
        </blockquote>
      </section>

      <section className="cta-strip">
        <h2>Your farm's finances, finally working for you.</h2>
        <button className="btn" onClick={onLaunch}>Open my farm ledger</button>
      </section>
    </div>
  );
}

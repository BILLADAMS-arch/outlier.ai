import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { publicStats } from '../services/profiles'

// Unsplash photo ids (each was fetched and confirmed to return an image).
const photo = (id, w, h) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`
const P = {
  hr: 'photo-1573496359142-b8d87734a5a2', sales: 'photo-1600880292203-757bb62b4baf', edu: 'photo-1531482615713-2afd69097998',
  code: 'photo-1461749280684-dccba630e2f6', design: 'photo-1516534775068-ba3e7458af70', ai: 'photo-1677442136019-21780ecad995',
  eng: 'photo-1581091226825-a6a2a5aee158', pm: 'photo-1590402494587-44b71d7772f6', support: 'photo-1556742049-0cfed4f6a45d',
  mkt: 'photo-1460925895917-afdab827c52f', video: 'photo-1516035069371-29a1b244cc32', research: 'photo-1542744173-8e7e53415bb0',
}
const COLUMNS = [
  [{ photo: P.hr, name: 'Human Resources & Recruitment', tint: '#0f766e', h: 330 }],
  [{ stat: 'tasks', bg: 'linear-gradient(135deg,#3b82f6,#60a5fa)', h: 118 }, { photo: P.code, name: 'Software Development', tint: '#4c1d95', h: 196 }],
  [{ photo: P.sales, name: 'Sales & Business Development', tint: '#9a3412', h: 330 }],
  [{ photo: P.design, name: 'Graphic Design & Branding', tint: '#be185d', h: 196 }, { stat: 'range', bg: 'linear-gradient(135deg,#f97316,#fb923c)', h: 118 }],
  [{ photo: P.ai, name: 'AI & Machine Learning', tint: '#1e3a8a', h: 330 }],
  [{ stat: 'cats', bg: 'linear-gradient(135deg,#10b981,#34d399)', h: 118 }, { photo: P.eng, name: 'Engineering & Technical Services', tint: '#334155', h: 196 }],
  [{ photo: P.pm, name: 'Project Management', tint: '#6d28d9', h: 330 }],
  [{ photo: P.support, name: 'Customer Support', tint: '#0369a1', h: 196 }, { stat: 'hourly', bg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', h: 118 }],
  [{ photo: P.edu, name: 'Education & Online Tutoring', tint: '#b45309', h: 330 }],
  [{ stat: 'approved', bg: 'linear-gradient(135deg,#ec4899,#f472b6)', h: 118 }, { photo: P.mkt, name: 'Digital Marketing & SEO', tint: '#0e7490', h: 196 }],
  [{ photo: P.video, name: 'Video Editing & Photography', tint: '#111827', h: 330 }],
  [{ photo: P.research, name: 'Research & Business Consulting', tint: '#166534', h: 196 }, { stat: 'usd', bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', h: 118 }],
]

function Card({ card, stats }) {
  const [failed, setFailed] = useState(false)
  if (card.stat) {
    const text = {
      tasks: [stats ? `${stats.tasks}+` : '—', 'open projects'],
      range: [stats ? `$${stats.minRate}–$${stats.maxRate}` : '—', 'per hour'],
      cats: [stats ? String(stats.categories) : '—', 'categories'],
      hourly: ['Hourly', 'pay on tracked time'],
      approved: ['Approved', 'hours are what you earn'],
      usd: ['USD', 'rate agreed up front'],
    }[card.stat]
    return <div className="lp-card lp-stat" style={{ '--bg': card.bg, '--h': `${card.h}px` }}><strong>{text[0]}</strong><span>{text[1]}</span></div>
  }
  return (
    <figure className={`lp-card lp-photo${failed ? ' lp-noimg' : ''}`} style={{ '--tint': card.tint, '--h': `${card.h}px` }}>
      {!failed && <img src={photo(card.photo, 520, card.h * 2)} alt="" loading="lazy" decoding="async" width="520" height={card.h * 2} onError={() => setFailed(true)} />}
      <figcaption><strong>{card.name}</strong><span>Remote projects</span></figcaption>
    </figure>
  )
}

export default function Landing() {
  const { session } = useAuth()
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let off = false
    publicStats().then((s) => !off && s?.tasks && setStats(s), () => {})
    return () => { off = true }
  }, [])
  return (
    <div className="lp-root">
      <div className="lp-bg" aria-hidden="true" />
      <header className="lp-nav">
        <Link className="lp-brand" to="/" aria-label="Outlier home"><img src="/images/outlier.png" alt="Outlier" width="119" height="26" /></Link>
        <nav className="lp-links" aria-label="Main">
          <a href="#how">How it works</a>
          <Link to="/marketplace">Browse projects</Link>
          <a href="#categories">Categories</a>
        </nav>
        <div className="lp-nav-actions">
          {session ? <Link className="lp-btn lp-ghost" to="/dashboard">Dashboard</Link> : <Link className="lp-btn lp-ghost" to="/login">Login</Link>}
          <Link className="lp-btn lp-primary" to="/marketplace">View tasks</Link>
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <h1>Get paid for what<br />you already know</h1>
          <p className="lp-sub">
            {stats ? <>Choose from <b>{stats.tasks}+</b> remote projects across <b>{stats.categories}</b> categories, paying <b>${stats.minRate}–${stats.maxRate}</b> an hour. </> : 'Choose from remote projects across many categories. '}
            Create an account, get approved, do the work on a tracked timer, and earn for every approved hour.
          </p>
          <div className="lp-cta">
            <Link className="lp-btn lp-primary lp-big" to="/marketplace">View tasks</Link>
            <Link className="lp-btn lp-ghost lp-big" to="/login?mode=signup">Create account</Link>
          </div>
        </section>
        <section className="lp-stage" id="categories" aria-label="Project categories">
          <div className="lp-track">
            {[0, 1].map((half) => COLUMNS.map((cards, i) => (
              <div className="lp-col" key={`${half}-${i}`} style={{ '--i': i }} aria-hidden={half ? 'true' : undefined}>
                {cards.map((c, j) => <Card key={j} card={c} stats={stats} />)}
              </div>
            )))}
          </div>
        </section>
        <section className="lp-how" id="how">
          <h2>How it works</h2>
          <ol>
            <li><b>Register</b> with your full name. An administrator reviews and approves your account.</li>
            <li><b>Find a project</b> and apply, or get assigned directly. Work starts after approval.</li>
            <li><b>Onboard</b>, then work on a server-tracked timer you can pause and resume.</li>
            <li><b>Submit</b> your work. Approved hours × your hourly rate become your earnings.</li>
          </ol>
        </section>
      </main>
      <p className="lp-credit">Photography via <a href="https://unsplash.com/?utm_source=outlier&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a></p>
    </div>
  )
}

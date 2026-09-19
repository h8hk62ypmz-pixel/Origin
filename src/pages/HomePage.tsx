import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <>
      <section className="hero" aria-label="DriveSA hero">
        <div className="hero-media" />
        <div className="hero-sheen" />
        <div className="hero-copy">
          <div className="brand-mark">
            Drive<span>SA</span>
          </div>
          <h1>Book a driving lesson the moment a seat opens.</h1>
          <p>
            Live calendar for South Australia instructors — attach your learner, provisional, or
            international licence and pay straight away.
          </p>
          <div className="hero-actions">
            <Link to="/book" className="btn btn-mark">
              See open times
            </Link>
            <a href="#how" className="btn btn-ghost" style={{ color: '#f7f4ec', borderColor: 'rgba(247,244,236,0.35)' }}>
              How it works
            </a>
          </div>
        </div>
      </section>

      <section className="shell section" id="how">
        <div className="section-head">
          <h2>Three steps. You’re on the road.</h2>
          <p>
            Built for Adelaide metro learners, P-platers converting hours, and overseas drivers
            needing SA-ready practice.
          </p>
        </div>
        <div className="split">
          <div className="wizard">
            <h3 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>1 · Pick a slot</h3>
            <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.5 }}>
              The shared calendar shows who’s free this week — Norwood, Prospect, Glenelg and more.
              What you see is bookable now.
            </p>
            <h3 style={{ fontSize: '1.6rem', margin: '1.25rem 0 0.75rem' }}>2 · Attach your licence</h3>
            <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.5 }}>
              Upload a photo or PDF of a learner’s permit, P1/P2, full SA, interstate, or
              international licence so your instructor can verify before you meet.
            </p>
            <h3 style={{ fontSize: '1.6rem', margin: '1.25rem 0 0.75rem' }}>3 · Pay instantly</h3>
            <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.5 }}>
              Secure card checkout in AUD. Demo mode works out of the box; connect Stripe for live
              payments.
            </p>
          </div>
          <div>
            <div
              style={{
                minHeight: 320,
                background:
                  "linear-gradient(160deg, rgba(27,42,36,0.55), rgba(27,42,36,0.15)), url('https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80') center/cover",
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow)',
              }}
              role="img"
              aria-label="Car on an open road"
            />
            <p style={{ marginTop: '0.85rem', opacity: 0.7, fontSize: '0.92rem' }}>
              Covering automatic & manual lessons, highway confidence, VORT / CBD test prep, and
              international conversions.
            </p>
            <Link to="/book" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Open the booking calendar
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" className="landing-mark" aria-label="ISS Tracker home">
          <img src="/logo.svg" alt="ISS Tracker" />
        </Link>
        <nav aria-label="Landing page navigation">
          <Link href="/more-about-iss">ABOUT ISS</Link>
          <Link href="/tracker">LIVE TRACKER</Link>
          <Link href="/more-about-iss#science">SCIENCE</Link>
        </nav>
        <Link href="/tracker" className="landing-menu" aria-label="Open live tracker">↗</Link>
      </header>

      <section className="landing-hero">
        <div className="landing-visual">
          <div className="visual-image" role="img" aria-label="Astronaut during a spacewalk" />
          <div className="visual-grain" />
          <div className="visual-caption">
            <span>01</span>
            <span>THE ORBITAL OUTPOST</span>
          </div>
          <div className="visual-index" aria-hidden="true">
            <span className="active">01</span>
            <span>02</span>
            <span>03</span>
          </div>
        </div>

        <div className="landing-copy">
          <div className="landing-kicker"><span>01</span><i /> <span>03</span></div>
          <p className="landing-eyebrow">LIVE ISS TRACKER / SPACE EXPLORATION</p>
          <h1>Space<br /><em>Exploration.</em></h1>
          <p className="landing-intro">
            Follow humanity's orbiting laboratory, explore the International Space Station,
            and see where it is above Earth right now.
          </p>
          <div className="landing-actions">
            <Link href="/tracker" className="landing-primary">TRACK THE ISS <span>↗</span></Link>
            <Link href="/more-about-iss" className="landing-secondary">EXPLORE THE ISS</Link>
          </div>
        </div>

        <div className="landing-stars" aria-hidden="true" />
      </section>

      <section className="landing-bottom">
        <Link href="/tracker" className="landing-feature">
          <span className="feature-number">01</span>
          <span><strong>THE ISS</strong><small>Live orbital position &amp; telemetry</small></span>
          <span className="feature-arrow">↗</span>
        </Link>
        <Link href="/more-about-iss" className="landing-feature">
          <span className="feature-number">02</span>
          <span><strong>THE STATION</strong><small>Structure, purpose &amp; history</small></span>
          <span className="feature-arrow">↗</span>
        </Link>
        <Link href="/more-about-iss#science" className="landing-feature">
          <span className="feature-number">03</span>
          <span><strong>THE SCIENCE</strong><small>Research beyond Earth's surface</small></span>
          <span className="feature-arrow">↗</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <span>© ISS TRACKER</span>
        <span>EARTH / LOW EARTH ORBIT</span>
        <span><Link href="/tracker">LIVE VIEW ↗</Link></span>
      </footer>
    </main>
  );
}

import Link from "next/link";
import SolarSystemScene from "./solar-system-scene";
import styles from "./solar-system.module.css";

export default function SolarSystemPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="ISS Tracker home">
          <span className={styles.brandIcon}>🛰️</span>
          <span>LIVE ISS TRACKER</span>
        </Link>
        <div className={styles.headerCenter}>SOLAR SYSTEM / 3D EXPLORATION</div>
        <nav className={styles.nav}>
          <Link href="/">HOME</Link>
          <Link href="/tracker">ISS</Link>
          <Link href="/more-about-iss">ABOUT ISS</Link>
        </nav>
      </header>

      <section className={styles.stage} aria-label="Interactive 3D solar system">
        <SolarSystemScene />
        <div className={styles.cornerTopLeft}>
          <span className={styles.liveDot} /> LIVE SIMULATION
          <small>HELIOCENTRIC / J2000</small>
        </div>
        <div className={styles.titleBlock}>
          <span>01 / THE NEIGHBORHOOD</span>
          <h1>THE SOLAR<br /><em>SYSTEM.</em></h1>
          <p>Explore the planets in three dimensions. Drag to orbit, scroll to zoom, and select a world to inspect it.</p>
        </div>
        <div className={styles.helpBlock}>
          <span>DRAG</span> ROTATE &nbsp;&nbsp; <span>SCROLL</span> ZOOM &nbsp;&nbsp; <span>CLICK</span> INSPECT
        </div>
      </section>

      <section className={styles.spinnerOption} aria-label="Solar Spinner">
        <div>
          <span className={styles.spinnerEyebrow}>ANOTHER WAY TO EXPLORE</span>
          <h2>SOLAR <em>SPINNER.</em></h2>
          <p>A cinematic planet-by-planet selector inspired by the classic solar spinner interface. Pick a world and let it take center stage.</p>
        </div>
        <Link href="/solar-spinner" className={styles.spinnerButton}>OPEN SOLAR SPINNER <span>↗</span></Link>
      </section>

      <footer className={styles.footer}>
        <span>© ISS TRACKER</span>
        <span>NASA-INSPIRED / 3D SOLAR SYSTEM</span>
        <Link href="/tracker">LIVE VIEW ↗</Link>
      </footer>
    </main>
  );
}

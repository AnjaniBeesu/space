"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./solar-spinner.module.css";

const planets = [
  { name: "Mercury", description: "Tiny and close to the Sun.", tilt: "3.13", gravity: "0.9", hours: "10", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/1_mercury.jpg" },
  { name: "Venus", description: "A world wrapped in a dense, hot atmosphere.", tilt: "4.13", gravity: "0.2", hours: "20", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/2_venus.jpg" },
  { name: "Earth", description: "The only known world with life.", tilt: "5.13", gravity: "7.3", hours: "30", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/3_earth.jpg" },
  { name: "Mars", description: "A cold, dusty world with ancient valleys.", tilt: "6.13", gravity: "1.1", hours: "40", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/4_mars.jpg" },
  { name: "Jupiter", description: "The giant world of storms and bands.", tilt: "11.13", gravity: "1.8", hours: "50", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/5_jupiter.jpg" },
  { name: "Saturn", description: "The ringed giant of the outer system.", tilt: "9.13", gravity: "7.3", hours: "60", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/6_saturn.jpg" },
  { name: "Uranus", description: "An ice giant rotating on its side.", tilt: "11.13", gravity: "1.8", hours: "50", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/7_uranus.jpg" },
  { name: "Neptune", description: "A distant blue world of supersonic winds.", tilt: "31.03", gravity: "8.9", hours: "10", image: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-1188/8_neptune.jpg" },
];

export default function SolarSpinnerPage() {
  const [active, setActive] = useState(0);
  const planet = planets[active];

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <Link href="/solar-system" className={styles.back}>← SOLAR SYSTEM</Link>
        <span>SOLAR SPINNER / PLANET SELECTOR</span>
        <span>08 WORLDS</span>
      </header>

      <section className={styles.spinner} aria-label="Solar Spinner planet explorer">
        <div className={styles.meta}>01 / 08 <i /> INTERACTIVE PLANET ARCHIVE</div>

        <div className={styles.copy}>
          <p>PLANET {String(active + 1).padStart(2, "0")}</p>
          <h1 key={planet.name}>{planet.name}</h1>
          <div className={styles.description}>{planet.description}</div>

          <div className={styles.details} key={`${planet.name}-details`}>
            <div><strong>{planet.tilt}°</strong><small>TILT</small></div>
            <div><strong>{planet.gravity}×</strong><small>GRAVITY</small></div>
            <div><strong>{planet.hours}</strong><small>HOURS</small></div>
          </div>
        </div>

        <figure className={styles.planetFigure} key={planet.name}>
          <img src={planet.image} alt={`${planet.name} surface`} />
        </figure>

        <nav className={styles.planetNav} aria-label="Select a planet">
          {planets.map((item, index) => (
            <button
              key={item.name}
              className={index === active ? styles.active : ""}
              onClick={() => setActive(index)}
              aria-current={index === active ? "true" : undefined}
            >
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className={styles.counter}>{String(active + 1).padStart(2, "0")} / {String(planets.length).padStart(2, "0")}</div>
      </section>

      <footer className={styles.footer}>
        <span>© ISS TRACKER</span>
        <span>SOLAR SPINNER</span>
        <Link href="/solar-system">RETURN TO 3D SYSTEM ↗</Link>
      </footer>
    </main>
  );
}

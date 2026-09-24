"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const IssMap = dynamic(() => import("./components/iss-map"), { ssr: false, loading: () => <div className="map-loading">Loading orbital map…</div> });

type Position = { latitude: number; longitude: number };
type IssData = Position & { timestamp: number; altitude: number; velocity: number; visibility?: string; source: string; orbit: Position[]; bearing: number };

function formatTime(timestamp: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(timestamp * 1000));
}

export default function Home() {
  const [data, setData] = useState<IssData | null>(null);
  const [trail, setTrail] = useState<Position[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/iss", { cache: "no-store" });
        const next = await response.json();
        if (!response.ok) throw new Error(next.error || "Could not load ISS data");
        if (!active) return;
        setData(next);
        setTrail((current) => [...current.slice(-39), { latitude: next.latitude, longitude: next.longitude }]);
        setError("");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong");
      }
    };
    load();
    const interval = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const hemisphere = useMemo(() => {
    if (!data) return "—";
    const ns = data.latitude >= 0 ? "N" : "S";
    const ew = data.longitude >= 0 ? "E" : "W";
    return `${Math.abs(data.latitude).toFixed(2)}° ${ns}, ${Math.abs(data.longitude).toFixed(2)}° ${ew}`;
  }, [data]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo" aria-label="ISS spacecraft logo"><img src="/logo.svg" alt="ISS spacecraft" /></div>
          <span className="brand-title">LIVE ISS TRACKER</span>
        </div>
        <nav className="site-nav" aria-label="Main navigation">
          <button type="button">HOME</button>
          <button type="button">MORE ABOUT ISS</button>
        </nav>
      </header>

      <section className="hero">
        <div>
          <h1>WHERE IS THE <em>ISS</em> RIGHT NOW?</h1>
        </div>
        <div className="orbit-badge"><span className="live-dot">◉</span> LIVE <span>·</span> updates every 5s</div>
      </section>

      <section className="map-card">
        {data ? <IssMap position={data} trail={trail} orbit={data.orbit} bearing={data.bearing} /> : <div className="map-loading">Establishing orbital lock…</div>}
        <div className="map-overlay"><span>EARTH / LIVE ORBIT</span><span>{data?.visibility ? data.visibility.toUpperCase() : "LOW EARTH ORBIT"}</span></div>
        <div className="orbit-legend"><span className="legend-line" /> LIVE ORBITAL GROUND TRACK <i>·</i> SGP4 / TLE</div>
      </section>

      <section className="stats">
        <article><span>POSITION</span><strong>{hemisphere}</strong><small>Latitude / longitude</small></article>
        <article><span>ALTITUDE</span><strong>{data ? `${data.altitude.toFixed(1)} km` : "—"}</strong><small>Above mean sea level</small></article>
        <article><span>VELOCITY</span><strong>{data ? `${Math.round(data.velocity).toLocaleString()} km/h` : "—"}</strong><small>Orbital speed</small></article>
        <article><span>LAST SIGNAL</span><strong>{data ? formatTime(data.timestamp) : "—"}</strong><small>Live telemetry</small></article>
      </section>

      <footer><span>SPACE / 2026</span><span>DATA: WHERE THE ISS AT? · ORBIT: CELESTRAK TLE</span></footer>
    </main>
  );
}

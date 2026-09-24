"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

type Position = { latitude: number; longitude: number };
type LatLng = [number, number];

function Recenter({ position }: { position: Position }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.8 });
  }, [map, position.latitude, position.longitude]);
  return null;
}

function getSunPosition(date = new Date()): { latitude: number; longitude: number } {
  const day = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1;
  const gamma = (2 * Math.PI / 365) * (day - 1 + (date.getUTCHours() - 12) / 24);
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const subsolarLongitude = ((720 - minutes - equationOfTime) / 4 + 540) % 360 - 180;
  return { latitude: (declination * 180) / Math.PI, longitude: subsolarLongitude };
}

function Terminator({ now }: { now: number }) {
  const { latitude: sunLat, longitude: sunLon } = useMemo(() => getSunPosition(new Date(now)), [now]);
  const terminator = useMemo<LatLng[]>(() => {
    const lat = (sunLat * Math.PI) / 180;
    const lon = (sunLon * Math.PI) / 180;
    const sun = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    const reference = Math.abs(sun[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const cross = [reference[1] * sun[2] - reference[2] * sun[1], reference[2] * sun[0] - reference[0] * sun[2], reference[0] * sun[1] - reference[1] * sun[0]];
    const crossLength = Math.hypot(...cross);
    const e1 = cross.map((v) => v / crossLength);
    const e2 = [sun[1] * e1[2] - sun[2] * e1[1], sun[2] * e1[0] - sun[0] * e1[2], sun[0] * e1[1] - sun[1] * e1[0]];
    return Array.from({ length: 181 }, (_, i) => {
      const t = (i / 180) * Math.PI * 2;
      const x = e1[0] * Math.cos(t) + e2[0] * Math.sin(t);
      const y = e1[1] * Math.cos(t) + e2[1] * Math.sin(t);
      const z = e1[2] * Math.cos(t) + e2[2] * Math.sin(t);
      return [Math.asin(z) * 180 / Math.PI, Math.atan2(y, x) * 180 / Math.PI] as LatLng;
    });
  }, [sunLat, sunLon]);

  const night = useMemo<LatLng[][]>(() => {
    const antiLon = ((sunLon + 180 + 180) % 360) - 180;
    const left = terminator.filter(([, lon]) => lon <= antiLon);
    const right = terminator.filter(([, lon]) => lon > antiLon);
    return [[[90, antiLon], ...left, [-90, antiLon]], [[90, antiLon], ...right, [-90, antiLon]]];
  }, [terminator, sunLon]);

  return (
    <>
      {night.map((polygon, index) => <Polygon key={index} positions={polygon} pathOptions={{ color: "#07101f", weight: 0, fillColor: "#07101f", fillOpacity: 0.34 }} />)}
      <Polyline positions={terminator} pathOptions={{ color: "#f8e7a4", weight: 1.5, opacity: 0.75, dashArray: "5 5" }} />
    </>
  );
}

function splitAntimeridian(points: LatLng[]) {
  if (points.length < 2) return [];
  const segments: LatLng[][] = [[]];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const previous = points[i - 1];
    if (previous && Math.abs(point[1] - previous[1]) > 180) segments.push([]);
    segments[segments.length - 1].push(point);
  }
  return segments.filter((segment) => segment.length > 1);
}

// Approximate ground track from the ISS orbital period (~92.6 min) and current telemetry.
function buildOrbit(position: Position, altitudeKm: number, velocityKmh: number): LatLng[][] {
  const earthRadiusKm = 6371;
  const orbitRadius = earthRadiusKm + Math.max(altitudeKm, 200);
  const orbitalSpeed = Math.max(velocityKmh, 27000);
  const periodMinutes = (2 * Math.PI * orbitRadius) / (orbitalSpeed / 60);
  const inclination = 51.64 * Math.PI / 180;
  const earthRotationPerMinute = 360 / 1436.07;
  const points: LatLng[] = [];
  const steps = 720;
  const minutes = periodMinutes;

  // The phase is anchored at the current ISS position. Longitude advances with
  // the orbital motion relative to the rotating Earth; latitude follows the
  // station's known 51.6° orbital inclination.
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * minutes;
    const phase = (t / periodMinutes) * 2 * Math.PI;
    const lat = Math.asin(Math.sin(inclination) * Math.sin(phase)) * 180 / Math.PI;
    const longitudinalMotion = (phase * 180 / Math.PI) - earthRotationPerMinute * t;
    const lon = ((position.longitude + longitudinalMotion + 540) % 360) - 180;
    points.push([lat, lon]);
  }
  return splitAntimeridian(points);
}

const issIcon = L.divIcon({
  className: "iss-spacecraft-marker",
  html: `<div class="iss-spacecraft"><span class="iss-body"></span><span class="iss-panel left"></span><span class="iss-panel right"></span><span class="iss-glow"></span></div>`,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
});

export default function IssMap({ position, trail, altitude, velocity }: { position: Position; trail: Position[]; altitude: number; velocity: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const orbit = useMemo(() => buildOrbit(position, altitude, velocity), [position, altitude, velocity]);

  return (
    <MapContainer center={[position.latitude, position.longitude]} zoom={2} minZoom={2} maxZoom={6} scrollWheelZoom className="iss-map">
      <TileLayer attribution='&copy; <a href="https://www.esri.com/">Esri</a> contributors' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.18} />
      <Terminator now={now} />

      {/* Predicted ground track: one full ISS revolution. */}
      {orbit.map((segment, index) => (
        <Polyline key={`orbit-${index}`} positions={segment} pathOptions={{ color: "#f5f7ff", weight: 2, opacity: 0.72, dashArray: "8 9" }} />
      ))}

      {/* Short historical track is kept faint so the live trajectory is visually distinct. */}
      {trail.length > 1 && <Polyline positions={trail.map((p) => [p.latitude, p.longitude] as LatLng)} pathOptions={{ color: "#ff6bd6", weight: 2, opacity: 0.28 }} />}
      <Marker position={[position.latitude, position.longitude]} icon={issIcon} />
      <CircleMarker center={[position.latitude, position.longitude]} radius={21} pathOptions={{ color: "#ff6bd6", weight: 1, fillOpacity: 0, opacity: 0.38 }} />
      <Recenter position={position} />
    </MapContainer>
  );
}

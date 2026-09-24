"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMap } from "react-leaflet";

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

export default function IssMap({ position, trail }: { position: Position; trail: Position[] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <MapContainer center={[position.latitude, position.longitude]} zoom={2} minZoom={2} maxZoom={6} scrollWheelZoom className="iss-map">
      <TileLayer attribution='&copy; <a href="https://www.esri.com/">Esri</a> contributors' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.18} />
      <Terminator now={now} />
      {trail.length > 1 && <Polyline positions={trail.map((p) => [p.latitude, p.longitude] as LatLng)} pathOptions={{ color: "#ff6bd6", weight: 3, opacity: 0.85 }} />}
      <CircleMarker center={[position.latitude, position.longitude]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#ff6bd6", fillOpacity: 1 }} />
      <CircleMarker center={[position.latitude, position.longitude]} radius={18} pathOptions={{ color: "#ff6bd6", weight: 1, fillOpacity: 0, opacity: 0.45 }} />
      <Recenter position={position} />
    </MapContainer>
  );
}

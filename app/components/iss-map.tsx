"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

type Position = { latitude: number; longitude: number };
type LatLng = [number, number];
type OrbitPoint = { latitude: number; longitude: number };

function Recenter({ position }: { position: Position }) {
  const map = useMap();
  useEffect(() => { map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.8 }); }, [map, position.latitude, position.longitude]);
  return null;
}

function getSunPosition(date = new Date()) {
  const day = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1;
  const gamma = (2 * Math.PI / 365) * (day - 1 + (date.getUTCHours() - 12) / 24);
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  return { latitude: declination * 180 / Math.PI, longitude: ((720 - minutes - equationOfTime) / 4 + 540) % 360 - 180 };
}

function Terminator({ now }: { now: number }) {
  const { latitude: sunLat, longitude: sunLon } = useMemo(() => getSunPosition(new Date(now)), [now]);
  const points = useMemo<LatLng[]>(() => {
    const lat = sunLat * Math.PI / 180, lon = sunLon * Math.PI / 180;
    const sun = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    const reference = Math.abs(sun[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const cross = [reference[1] * sun[2] - reference[2] * sun[1], reference[2] * sun[0] - reference[0] * sun[2], reference[0] * sun[1] - reference[1] * sun[0]];
    const length = Math.hypot(...cross), e1 = cross.map((v) => v / length);
    const e2 = [sun[1] * e1[2] - sun[2] * e1[1], sun[2] * e1[0] - sun[0] * e1[2], sun[0] * e1[1] - sun[1] * e1[0]];
    return Array.from({ length: 181 }, (_, i) => {
      const t = i / 180 * Math.PI * 2;
      return [Math.asin(e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * 180 / Math.PI, Math.atan2(e1[1] * Math.cos(t) + e2[1] * Math.sin(t), e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * 180 / Math.PI] as LatLng;
    });
  }, [sunLat, sunLon]);
  return <Polyline positions={points} pathOptions={{ color: "#f8e7a4", weight: 1.5, opacity: 0.75, dashArray: "5 5" }} />;
}

function unfoldOrbit(points: OrbitPoint[], anchorLongitude: number): LatLng[] {
  if (!points.length) return [];
  const result: LatLng[] = [[points[0].latitude, points[0].longitude]];
  for (let i = 1; i < points.length; i++) {
    const previous = result[i - 1][1];
    let longitude = points[i].longitude;
    while (longitude - previous > 180) longitude -= 360;
    while (longitude - previous < -180) longitude += 360;
    result.push([points[i].latitude, longitude]);
  }
  const closest = result.reduce((best, point, index) => {
    const bestDistance = Math.abs(best.point[1] - anchorLongitude);
    const distance = Math.abs(point[1] - anchorLongitude);
    return distance < bestDistance ? { point, index } : best;
  }, { point: result[0], index: 0 });
  const offset = Math.round((anchorLongitude - closest.point[1]) / 360) * 360;
  return result.map(([latitude, longitude]) => [latitude, longitude + offset] as LatLng);
}

function createIssIcon(bearing: number) {
  return L.divIcon({
    className: "iss-spacecraft-marker",
    html: `<div class="iss-spacecraft" style="--bearing:${bearing}deg"><span class="iss-ring ring-one"></span><span class="iss-ring ring-two"></span><span class="iss-ring ring-three"></span><span class="iss-direction"></span><span class="iss-body"></span><span class="iss-panel left"></span><span class="iss-panel right"></span><span class="iss-glow"></span><span class="iss-label">ISS</span></div>`,
    iconSize: [74, 74],
    iconAnchor: [37, 37],
  });
}

export default function IssMap({ position, trail, orbit, bearing }: { position: Position; trail: Position[]; orbit: OrbitPoint[]; bearing: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const continuousOrbit = useMemo(() => unfoldOrbit(orbit, position.longitude), [orbit, position.longitude]);
  const issIcon = useMemo(() => createIssIcon(bearing), [bearing]);

  return (
    <MapContainer center={[position.latitude, position.longitude]} zoom={2.5} minZoom={2.5} maxZoom={7} worldCopyJump={false} maxBounds={[[-90, -180], [90, 180]]} maxBoundsViscosity={1} scrollWheelZoom className="iss-map">
      <TileLayer attribution='&copy; <a href="https://www.esri.com/">Esri</a> contributors' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} noWrap />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.16} noWrap />
      <Terminator now={now} />
      <Polyline positions={continuousOrbit} pathOptions={{ color: "#ffffff", weight: 3, opacity: 0.92, lineCap: "round", lineJoin: "round" }} />
      <Polyline positions={continuousOrbit} pathOptions={{ color: "#dce8ff", weight: 1, opacity: 0.48, lineCap: "round", lineJoin: "round" }} />
      {trail.length > 1 && <Polyline positions={trail.map((p) => [p.latitude, p.longitude] as LatLng)} pathOptions={{ color: "#ff6bd6", weight: 3, opacity: 0.42, lineCap: "round", lineJoin: "round" }} />}
      <Marker position={[position.latitude, position.longitude]} icon={issIcon} zIndexOffset={1000} />
      <CircleMarker center={[position.latitude, position.longitude]} radius={24} pathOptions={{ color: "#ff6bd6", weight: 1, fillOpacity: 0, opacity: 0.35 }} />
      <Recenter position={position} />
    </MapContainer>
  );
}

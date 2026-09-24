"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";

type Position = { latitude: number; longitude: number };

function Recenter({ position }: { position: Position }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.8 });
  }, [map, position.latitude, position.longitude]);
  return null;
}

export default function IssMap({ position, trail }: { position: Position; trail: Position[] }) {
  return (
    <MapContainer center={[position.latitude, position.longitude]} zoom={2} minZoom={2} maxZoom={6} scrollWheelZoom className="iss-map">
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a> contributors'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        opacity={0.18}
      />
      {trail.length > 1 && <Polyline positions={trail.map((p) => [p.latitude, p.longitude] as [number, number])} pathOptions={{ color: "#ff6bd6", weight: 3, opacity: 0.85 }} />}
      <CircleMarker center={[position.latitude, position.longitude]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#ff6bd6", fillOpacity: 1 }} />
      <CircleMarker center={[position.latitude, position.longitude]} radius={18} pathOptions={{ color: "#ff6bd6", weight: 1, fillOpacity: 0, opacity: 0.45 }} />
      <Recenter position={position} />
    </MapContainer>
  );
}

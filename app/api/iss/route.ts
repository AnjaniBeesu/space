import { NextResponse } from "next/server";
import * as satellite from "satellite.js";

const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544?units=kilometers";
const TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";

type OrbitPoint = { latitude: number; longitude: number };

function wrapLongitude(longitude: number) {
  return ((longitude + 540) % 360) - 180;
}

function longitudeDistance(a: number, b: number) {
  return Math.abs(wrapLongitude(a - b));
}

function buildGroundTrack(line1: string, line2: string, start: Date, liveLatitude: number, liveLongitude: number): OrbitPoint[] {
  const satrec = satellite.twoline2satrec(line1, line2);
  const points: OrbitPoint[] = [];
  const startMs = start.getTime();

  // Propagate exactly one ISS revolution around the live telemetry timestamp.
  for (let second = -46 * 60; second <= 46 * 60; second += 10) {
    const date = new Date(startMs + second * 1000);
    const propagated = satellite.propagate(satrec, date);
    if (!propagated || typeof propagated === "boolean" || !propagated.position || typeof propagated.position === "boolean") continue;

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(propagated.position, gmst);
    points.push({
      latitude: satellite.degreesLat(geodetic.latitude),
      longitude: satellite.degreesLong(geodetic.longitude),
    });
  }

  if (!points.length) return points;

  // Find the propagated point corresponding to the live ISS position.
  let closestIndex = 0;
  let closestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.hypot(point.latitude - liveLatitude, longitudeDistance(point.longitude, liveLongitude));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  // Translate the propagated ground track so the live ISS position is the
  // exact anchor. This preserves the SGP4 orbital shape while eliminating
  // the visible gap between the spacecraft and its trajectory.
  const anchor = points[closestIndex];
  const latitudeOffset = liveLatitude - anchor.latitude;
  const longitudeOffset = wrapLongitude(liveLongitude - anchor.longitude);
  const aligned = points.map((point) => ({
    latitude: Math.max(-90, Math.min(90, point.latitude + latitudeOffset)),
    longitude: wrapLongitude(point.longitude + longitudeOffset),
  }));

  // Force the anchor itself to the live telemetry coordinate, not an
  // approximation of it.
  aligned[closestIndex] = { latitude: liveLatitude, longitude: liveLongitude };
  return aligned;
}

function getBearing(points: OrbitPoint[], liveLatitude: number, liveLongitude: number) {
  if (points.length < 2) return 0;
  let closestIndex = 0;
  let closestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.hypot(point.latitude - liveLatitude, longitudeDistance(point.longitude, liveLongitude));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  const previous = points[Math.max(0, closestIndex - 1)];
  const next = points[Math.min(points.length - 1, closestIndex + 1)];
  return Math.atan2(
    longitudeDistance(next.longitude, previous.longitude) * Math.sign(wrapLongitude(next.longitude - previous.longitude)),
    next.latitude - previous.latitude,
  ) * 180 / Math.PI;
}

export async function GET() {
  try {
    const [issResponse, tleResponse] = await Promise.all([
      fetch(ISS_URL, { cache: "no-store" }),
      fetch(TLE_URL, { cache: "no-store" }),
    ]);

    if (!issResponse.ok || !tleResponse.ok) {
      return NextResponse.json({ error: "ISS data source unavailable" }, { status: 502 });
    }

    const data = await issResponse.json();
    const tle = (await tleResponse.text()).trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const line1 = tle.find((line) => line.startsWith("1 "));
    const line2 = tle.find((line) => line.startsWith("2 "));
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    const altitude = Number(data.altitude);
    const velocity = Number(data.velocity);
    const timestamp = Number(data.timestamp);

    if (![latitude, longitude, altitude, velocity, timestamp].every(Number.isFinite) || !line1 || !line2) {
      return NextResponse.json({ error: "Invalid ISS telemetry or orbital data" }, { status: 502 });
    }

    const orbit = buildGroundTrack(line1, line2, new Date(timestamp * 1000), latitude, longitude);
    const bearing = getBearing(orbit, latitude, longitude);

    return NextResponse.json({
      timestamp,
      latitude,
      longitude,
      altitude,
      velocity,
      visibility: data.visibility,
      source: "Where The ISS At? + CelesTrak TLE / SGP4",
      orbit,
      bearing,
    });
  } catch {
    return NextResponse.json({ error: "Unable to calculate ISS orbital data" }, { status: 503 });
  }
}

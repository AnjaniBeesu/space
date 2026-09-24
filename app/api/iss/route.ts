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

  // One clean ISS revolution, centered on the live position.
  // Keeping this to one orbit prevents the track from doubling back over itself.
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

  // Align the SGP4 track with the live telemetry so the ISS marker sits
  // directly on the trajectory without changing the orbital shape.
  let closest = points[0];
  let closestDistance = Infinity;
  for (const point of points) {
    const distance = Math.hypot(point.latitude - liveLatitude, longitudeDistance(point.longitude, liveLongitude));
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = point;
    }
  }

  const latitudeOffset = liveLatitude - closest.latitude;
  const longitudeOffset = wrapLongitude(liveLongitude - closest.longitude);
  return points.map((point) => ({
    latitude: Math.max(-90, Math.min(90, point.latitude + latitudeOffset)),
    longitude: wrapLongitude(point.longitude + longitudeOffset),
  }));
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
  const next = points[Math.min(closestIndex + 1, points.length - 1)];
  const current = points[closestIndex];
  return Math.atan2(longitudeDistance(next.longitude, current.longitude) * Math.sign(wrapLongitude(next.longitude - current.longitude)), next.latitude - current.latitude) * 180 / Math.PI;
}

export async function GET() {
  try {
    const [issResponse, tleResponse] = await Promise.all([
      fetch(ISS_URL, { cache: "no-store" }),
      fetch(TLE_URL, { next: { revalidate: 21_600 } }),
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

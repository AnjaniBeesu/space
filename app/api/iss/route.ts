import { NextResponse } from "next/server";
import * as satellite from "satellite.js";

const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544?units=kilometers";
const TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
const ISS_CACHE_MS = 3_500;
const TLE_CACHE_MS = 10 * 60_000;
const UPSTREAM_TIMEOUT_MS = 4_000;

type OrbitPoint = { latitude: number; longitude: number };
type IssPayload = {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility?: string;
};

type CachedValue<T> = { value: T; expiresAt: number };

let issCache: CachedValue<IssPayload> | null = null;
let tleCache: CachedValue<{ line1: string; line2: string }> | null = null;
let inFlight: Promise<{ data: IssPayload; line1: string; line2: string }> | null = null;

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

  let closestIndex = 0;
  let closestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.hypot(point.latitude - liveLatitude, longitudeDistance(point.longitude, liveLongitude));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  const anchor = points[closestIndex];
  const latitudeOffset = liveLatitude - anchor.latitude;
  const longitudeOffset = wrapLongitude(liveLongitude - anchor.longitude);
  const aligned = points.map((point) => ({
    latitude: Math.max(-90, Math.min(90, point.latitude + latitudeOffset)),
    longitude: wrapLongitude(point.longitude + longitudeOffset),
  }));

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

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getIssData(): Promise<IssPayload> {
  if (issCache && issCache.expiresAt > Date.now()) return issCache.value;
  const response = await fetchWithTimeout(ISS_URL);
  if (!response.ok) throw new Error(`ISS telemetry returned ${response.status}`);
  const data = await response.json();
  const value: IssPayload = {
    timestamp: Number(data.timestamp),
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    altitude: Number(data.altitude),
    velocity: Number(data.velocity),
    visibility: data.visibility,
  };
  if (![value.latitude, value.longitude, value.altitude, value.velocity, value.timestamp].every(Number.isFinite)) {
    throw new Error("Invalid ISS telemetry");
  }
  issCache = { value, expiresAt: Date.now() + ISS_CACHE_MS };
  return value;
}

async function getTle() {
  if (tleCache && tleCache.expiresAt > Date.now()) return tleCache.value;
  const response = await fetchWithTimeout(TLE_URL);
  if (!response.ok) throw new Error(`CelesTrak returned ${response.status}`);
  const tle = (await response.text()).trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const line1 = tle.find((line) => line.startsWith("1 "));
  const line2 = tle.find((line) => line.startsWith("2 "));
  if (!line1 || !line2) throw new Error("Invalid ISS TLE");
  const value = { line1, line2 };
  tleCache = { value, expiresAt: Date.now() + TLE_CACHE_MS };
  return value;
}

async function getSources() {
  if (inFlight) return inFlight;
  inFlight = Promise.all([getIssData(), getTle()]).then(([data, tle]) => ({ data, ...tle })).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function GET() {
  try {
    const { data, line1, line2 } = await getSources();
    const orbit = buildGroundTrack(line1, line2, new Date(data.timestamp * 1000), data.latitude, data.longitude);
    const bearing = getBearing(orbit, data.latitude, data.longitude);

    return NextResponse.json({
      ...data,
      source: "Where The ISS At? + CelesTrak TLE / SGP4",
      orbit,
      bearing,
    }, {
      headers: {
        "Cache-Control": "private, max-age=2, stale-while-revalidate=3",
      },
    });
  } catch {
    // Keep the tracker alive with the last valid telemetry instead of turning
    // a temporary upstream failure into a blank map/error state.
    if (issCache && tleCache) {
      const data = issCache.value;
      const { line1, line2 } = tleCache.value;
      const orbit = buildGroundTrack(line1, line2, new Date(data.timestamp * 1000), data.latitude, data.longitude);
      return NextResponse.json({
        ...data,
        source: "Where The ISS At? + CelesTrak TLE / SGP4 (cached)",
        orbit,
        bearing: getBearing(orbit, data.latitude, data.longitude),
        stale: true,
      }, {
        headers: {
          "Cache-Control": "private, max-age=2",
        },
      });
    }
    return NextResponse.json({ error: "ISS data source temporarily unavailable" }, { status: 503 });
  }
}

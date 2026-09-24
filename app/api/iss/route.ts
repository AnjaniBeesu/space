import { NextResponse } from "next/server";
import * as satellite from "satellite.js";

const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544?units=kilometers";
const TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";

function buildGroundTrack(line1: string, line2: string, start: Date) {
  const satrec = satellite.twoline2satrec(line1, line2);
  const points: { latitude: number; longitude: number }[] = [];
  const startMs = start.getTime();

  // One complete ISS revolution plus a little breathing room.
  for (let minute = -8; minute <= 102; minute += 1) {
    const date = new Date(startMs + minute * 60_000);
    const position = satellite.propagate(satrec, date).position;
    if (!position || typeof position === "boolean") continue;
    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(position, gmst);
    points.push({
      latitude: satellite.degreesLat(geodetic.latitude),
      longitude: satellite.degreesLong(geodetic.longitude),
    });
  }
  return points;
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

    const orbit = buildGroundTrack(line1, line2, new Date(timestamp * 1000));
    const next = orbit.find((point) => Math.abs(point.longitude - longitude) < 4 && Math.abs(point.latitude - latitude) < 4) ?? orbit[Math.min(8, orbit.length - 1)];
    const bearing = next ? Math.atan2(next.longitude - longitude, next.latitude - latitude) * 180 / Math.PI : 0;

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

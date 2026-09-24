import { NextResponse } from "next/server";

const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544?units=kilometers";

export async function GET() {
  try {
    const response = await fetch(ISS_URL, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "ISS data source unavailable" }, { status: 502 });
    }

    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    const altitude = Number(data.altitude);
    const velocity = Number(data.velocity);

    if (![latitude, longitude, altitude, velocity].every(Number.isFinite)) {
      return NextResponse.json({ error: "Invalid ISS telemetry" }, { status: 502 });
    }

    return NextResponse.json({
      timestamp: Number(data.timestamp),
      latitude,
      longitude,
      altitude,
      velocity,
      visibility: data.visibility,
      source: "Where The ISS At?",
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach ISS data source" }, { status: 503 });
  }
}

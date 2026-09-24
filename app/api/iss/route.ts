import { NextResponse } from "next/server";

const ISS_URL = "https://api.open-notify.org/iss-now.json";

export async function GET() {
  try {
    const response = await fetch(ISS_URL, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "ISS data source unavailable" }, { status: 502 });
    }

    const data = await response.json();
    const latitude = Number(data.iss_position?.latitude);
    const longitude = Number(data.iss_position?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "Invalid ISS coordinates" }, { status: 502 });
    }

    return NextResponse.json({
      timestamp: Number(data.timestamp),
      latitude,
      longitude,
      source: "Open Notify",
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach ISS data source" }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics?city=khalifa_city_auh&hours=24
 *
 * Proxies to the schoolzone-analytics-api Lambda Function URL so that
 * Vercel does not need AWS credentials — the Lambda runs with its IAM role.
 */
export async function GET(req: NextRequest) {
  const analyticsApiUrl = process.env.NEXT_PUBLIC_AWS_ANALYTICS_API_URL;

  if (!analyticsApiUrl) {
    return NextResponse.json({ error: "Analytics pipeline not configured" }, { status: 503 });
  }

  const city  = req.nextUrl.searchParams.get("city")  ?? "khalifa_city_auh";
  const hours = req.nextUrl.searchParams.get("hours") ?? "24";

  try {
    const upstream = await fetch(
      `${analyticsApiUrl}?city=${encodeURIComponent(city)}&hours=${encodeURIComponent(hours)}`,
      { next: { revalidate: 0 } }
    );
    const json = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json({ error: json.error ?? "Upstream error" }, { status: upstream.status });
    }
    return NextResponse.json(json);
  } catch (err) {
    console.error("Analytics proxy failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

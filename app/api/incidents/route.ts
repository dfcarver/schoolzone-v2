import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const ALLOWED_SCENARIOS = new Set(["normal", "surge", "weather", "dismissal"]);

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const scenario = searchParams.get("scenario") ?? "normal";
  const safeScenario = ALLOWED_SCENARIOS.has(scenario) ? scenario : "normal";

  try {
    const filePath = path.join(
      process.cwd(),
      "public/mock/scenarios",
      safeScenario,
      "incidents.json"
    );
    const json = await readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(json));
  } catch {
    return NextResponse.json({ error: "Incidents unavailable" }, { status: 500 });
  }
}

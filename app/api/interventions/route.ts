import { supabase } from "../../../lib/supabase";
import { Recommendation } from "../../../lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { zoneId?: unknown; recommendation?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { zoneId, recommendation } = body;

  if (typeof zoneId !== "string" || !zoneId) {
    return Response.json({ error: "zoneId required" }, { status: 400 });
  }

  if (!isRecommendation(recommendation)) {
    return Response.json({ error: "recommendation required" }, { status: 400 });
  }

  const { error } = await supabase.from("interventions").insert({
    zone_id: zoneId,
    recommendation,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

function isRecommendation(r: unknown): r is Recommendation {
  if (!r || typeof r !== "object") return false;
  const rec = r as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.action === "string" &&
    typeof rec.impact === "string" &&
    typeof rec.confidence === "number" &&
    typeof rec.priority === "string"
  );
}

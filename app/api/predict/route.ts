import { NextRequest, NextResponse } from "next/server";
import { PredictRequest, PredictResponse } from "@/lib/ai/predictTypes";
import { buildPredictPrompt } from "@/lib/ai/predictPrompt";

function isValidRequest(body: unknown): body is PredictRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.zone_id === "string" &&
    typeof b.zone_name === "string" &&
    typeof b.risk_score === "number" &&
    typeof b.risk_level === "string" &&
    typeof b.speed_avg_mph === "number" &&
    typeof b.pedestrian_count === "number" &&
    typeof b.vehicle_count === "number" &&
    Array.isArray(b.baseline_forecast) &&
    Array.isArray(b.active_interventions)
  );
}

function isValidResponse(data: unknown): data is PredictResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.headline === "string" &&
    ["rising", "stable", "falling"].includes(d.trend as string) &&
    typeof d.intervention_impact === "string" &&
    Array.isArray(d.predicted_forecast) &&
    (d.predicted_forecast as unknown[]).length === 6 &&
    (d.predicted_forecast as unknown[]).every(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as Record<string, unknown>).horizon_minutes === "number" &&
        typeof (p as Record<string, unknown>).predicted_risk === "number" &&
        typeof (p as Record<string, unknown>).confidence === "number"
    )
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured", code: "NO_API_KEY" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: "Request body does not conform to PredictRequest schema", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const prompt = buildPredictPrompt(body);

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are a structured data output system. Respond ONLY with valid JSON. No markdown, no explanations, no code fences.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      return NextResponse.json(
        { error: `OpenAI API error: ${openaiResponse.status}`, code: "LLM_ERROR" },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Empty response from LLM", code: "LLM_ERROR" },
        { status: 500 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "LLM returned invalid JSON", code: "CONTRACT_VIOLATION" },
        { status: 422 }
      );
    }

    if (!isValidResponse(parsed)) {
      return NextResponse.json(
        { error: "LLM response does not conform to PredictResponse schema", code: "CONTRACT_VIOLATION" },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Prediction request failed: ${message}`, code: "LLM_ERROR" },
      { status: 500 }
    );
  }
}

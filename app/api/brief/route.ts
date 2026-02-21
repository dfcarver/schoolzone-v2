import { NextRequest, NextResponse } from "next/server";
import { AIBriefRequest, AIBriefResponse, FALLBACK_BRIEF } from "@/lib/ai/types";
import { buildBriefPrompt } from "@/lib/ai/briefPrompt";

function generateCorrelationId(request: NextRequest): string {
  return request.headers.get("x-correlation-id") ?? `brief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidRequest(body: unknown): body is AIBriefRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.corridor_id === "string" &&
    typeof b.corridor_name === "string" &&
    typeof b.drift_status === "string" &&
    ["NORMAL", "WARNING", "CRITICAL"].includes(b.drift_status as string) &&
    typeof b.risk_score === "number" &&
    typeof b.congestion_index === "number" &&
    Array.isArray(b.forecast) &&
    Array.isArray(b.active_interventions)
  );
}

function isValidBriefResponse(data: unknown): data is AIBriefResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.executive_summary === "string" &&
    Array.isArray(d.drivers) &&
    d.drivers.every(
      (drv: unknown) =>
        typeof drv === "object" &&
        drv !== null &&
        typeof (drv as Record<string, unknown>).label === "string" &&
        typeof (drv as Record<string, unknown>).evidence === "string"
    ) &&
    typeof d.recommendation === "object" &&
    d.recommendation !== null &&
    typeof (d.recommendation as Record<string, unknown>).action === "string" &&
    typeof (d.recommendation as Record<string, unknown>).rationale === "string" &&
    typeof (d.recommendation as Record<string, unknown>).expected_impact === "string" &&
    Array.isArray(d.caveats) &&
    typeof d.confidence === "number"
  );
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId(request);

  const headers = {
    "X-Correlation-Id": correlationId,
    "Content-Type": "application/json",
  };

  // Feature flag check
  const aiEnabled = process.env.AI_NARRATIVE_ENABLED !== "false";
  if (!aiEnabled) {
    return NextResponse.json(FALLBACK_BRIEF, { status: 200, headers });
  }

  // API key check
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured", code: "NO_API_KEY", correlation_id: correlationId },
      { status: 401, headers }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body", code: "INVALID_REQUEST", correlation_id: correlationId },
      { status: 400, headers }
    );
  }

  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: "Request body does not conform to AIBriefRequest schema", code: "INVALID_REQUEST", correlation_id: correlationId },
      { status: 400, headers }
    );
  }

  // Build prompt and call OpenAI
  const prompt = buildBriefPrompt(body);

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a structured data output system. Respond ONLY with valid JSON. No markdown, no explanations, no code fences.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: `OpenAI API error: ${openaiResponse.status}`, code: "LLM_ERROR", correlation_id: correlationId },
        { status: 500, headers }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Empty response from LLM", code: "LLM_ERROR", correlation_id: correlationId },
        { status: 500, headers }
      );
    }

    // Parse strict JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "LLM returned invalid JSON", code: "CONTRACT_VIOLATION", correlation_id: correlationId },
        { status: 422, headers }
      );
    }

    // Validate response shape
    if (!isValidBriefResponse(parsed)) {
      return NextResponse.json(
        { error: "LLM response does not conform to AIBriefResponse schema", code: "CONTRACT_VIOLATION", correlation_id: correlationId },
        { status: 422, headers }
      );
    }

    return NextResponse.json(parsed, { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `LLM request failed: ${message}`, code: "LLM_ERROR", correlation_id: correlationId },
      { status: 500, headers }
    );
  }
}

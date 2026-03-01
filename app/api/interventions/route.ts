import { getAll, add, addListener, removeListener, StoredIntervention } from "../../../lib/interventionStore";
import { Recommendation } from "../../../lib/types";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "X-Accel-Buffering": "no",
  Connection: "keep-alive",
};

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let closed = false;
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  let listener: ((item: StoredIntervention) => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send current snapshot immediately
      controller.enqueue(encoder.encode(sseEvent("snapshot", getAll())));

      listener = (item: StoredIntervention) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseEvent("apply", item)));
        } catch {
          // stream already closed
        }
      };

      addListener(listener);

      // Keep-alive ping every 25 seconds
      keepAlive = setInterval(() => {
        if (closed) {
          clearInterval(keepAlive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 25_000);
    },
    cancel() {
      closed = true;
      clearInterval(keepAlive);
      if (listener) removeListener(listener);
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

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

  add(zoneId, recommendation);
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

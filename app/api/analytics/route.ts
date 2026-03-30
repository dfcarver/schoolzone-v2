import { NextRequest, NextResponse } from "next/server";
import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-athena";

const DATABASE        = "schoolzone_analytics";
const RESULTS_BUCKET  = "s3://schoolzone-datalake-304240833047-us-east-1/athena-results/";
const POLL_INTERVAL   = 600;  // ms
const MAX_POLLS       = 30;   // 18s timeout

function getAthenaClient(): AthenaClient {
  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    return new AthenaClient({
      region: "us-east-1",
      credentials: { accessKeyId, secretAccessKey, sessionToken: process.env.AWS_SESSION_TOKEN },
    });
  }
  return new AthenaClient({ region: "us-east-1" });
}

async function runQuery(sql: string): Promise<Record<string, string>[]> {
  const athena = getAthenaClient();
  const { QueryExecutionId } = await athena.send(new StartQueryExecutionCommand({
    QueryString: sql,
    QueryExecutionContext: { Database: DATABASE },
    ResultConfiguration: { OutputLocation: RESULTS_BUCKET },
  }));

  // Poll until done
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const { QueryExecution } = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId }));
    const state = QueryExecution?.Status?.State;
    if (state === "SUCCEEDED") break;
    if (state === "FAILED" || state === "CANCELLED") {
      throw new Error(`Athena query ${state}: ${QueryExecution?.Status?.StateChangeReason}`);
    }
  }

  const { ResultSet } = await athena.send(new GetQueryResultsCommand({ QueryExecutionId }));
  const rows = ResultSet?.Rows ?? [];
  if (rows.length < 2) return [];

  const headers = rows[0].Data?.map((d) => d.VarCharValue ?? "") ?? [];
  return rows.slice(1).map((row) => {
    const values = row.Data?.map((d) => d.VarCharValue ?? "") ?? [];
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

/**
 * GET /api/analytics?city=springfield_il&hours=24
 *
 * Returns hourly average risk scores per zone for the last N hours.
 */
export async function GET(req: NextRequest) {
  const awsConfigured =
    process.env.NEXT_PUBLIC_AWS_SNAPSHOT_API_URL &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY;

  if (!awsConfigured) {
    return NextResponse.json({ error: "AWS pipeline not configured" }, { status: 503 });
  }

  const city  = req.nextUrl.searchParams.get("city")  ?? "springfield_il";
  const hours = parseInt(req.nextUrl.searchParams.get("hours") ?? "24", 10);

  // ISO timestamp N hours ago
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();

  const sql = `
    SELECT
      zoneName,
      zoneId,
      date_trunc('hour', from_iso8601_timestamp(timestamp)) AS hour,
      round(avg(riskScore), 3)       AS avg_risk,
      round(avg(congestionIndex), 3) AS avg_congestion,
      round(avg(speedAvgMph), 1)     AS avg_speed,
      round(avg(vehicleCount), 0)    AS avg_vehicles
    FROM zone_telemetry
    WHERE cityId = '${city}'
      AND timestamp >= '${since}'
    GROUP BY zoneName, zoneId, date_trunc('hour', from_iso8601_timestamp(timestamp))
    ORDER BY hour ASC, zoneName ASC
  `;

  try {
    const rows = await runQuery(sql);
    return NextResponse.json({ rows, city, hours, since });
  } catch (err) {
    console.error("Athena query failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-athena";

const athena          = new AthenaClient({});
const DATABASE        = "schoolzone_analytics";
const RESULTS_BUCKET  = process.env.ATHENA_RESULTS_BUCKET!;
const POLL_INTERVAL   = 600;
const MAX_POLLS       = 50; // 30s timeout

async function runQuery(sql: string): Promise<Record<string, string>[]> {
  const { QueryExecutionId } = await athena.send(new StartQueryExecutionCommand({
    QueryString: sql,
    QueryExecutionContext: { Database: DATABASE },
    ResultConfiguration: { OutputLocation: RESULTS_BUCKET },
  }));

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

export const handler = async (event: {
  queryStringParameters?: Record<string, string>;
}): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> => {
  const city  = event.queryStringParameters?.city  ?? "khalifa_city_auh";
  const hours = parseInt(event.queryStringParameters?.hours ?? "24", 10);
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
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store",
      },
      body: JSON.stringify({ rows, city, hours, since }),
    };
  } catch (err) {
    console.error("Athena query failed:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: (err as Error).message }),
    };
  }
};

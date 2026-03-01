import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { KinesisStreamEvent } from "aws-lambda";

const ddb   = new DynamoDBClient({});
const TABLE = process.env.DYNAMODB_TABLE!;

interface ZonePayload {
  zoneId:          string;
  zoneName:        string;
  cityId:          string;
  timestamp:       string;
  riskScore:       number;
  vehicleCount:    number;
  pedestrianCount: number;
  speedAvgMph:     number;
  congestionIndex: number;
  activeCameras:   number;
  totalCameras:    number;
  weather:         string;
}

/**
 * Triggered by Kinesis Data Stream.
 * Writes the latest telemetry for each zone to DynamoDB (overwrites previous).
 * TTL of 10 minutes ensures stale records are automatically purged.
 */
export const handler = async (event: KinesisStreamEvent): Promise<void> => {
  const ttl = Math.floor(Date.now() / 1000) + 600; // 10-minute TTL

  const writes = event.Records.map(async (rec) => {
    const raw = Buffer.from(rec.kinesis.data, "base64").toString("utf-8").trim();
    let payload: ZonePayload;
    try {
      payload = JSON.parse(raw) as ZonePayload;
    } catch {
      console.warn("Failed to parse Kinesis record:", raw.slice(0, 200));
      return;
    }

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        city_id:         { S: payload.cityId },
        zone_id:         { S: payload.zoneId },
        zone_name:       { S: payload.zoneName },
        timestamp:       { S: payload.timestamp },
        risk_score:      { N: String(payload.riskScore) },
        vehicle_count:   { N: String(payload.vehicleCount) },
        pedestrian_count:{ N: String(payload.pedestrianCount) },
        speed_avg_mph:   { N: String(payload.speedAvgMph) },
        congestion_index:{ N: String(payload.congestionIndex) },
        active_cameras:  { N: String(payload.activeCameras) },
        total_cameras:   { N: String(payload.totalCameras) },
        weather:         { S: payload.weather },
        ttl:             { N: String(ttl) },
      },
    }));
  });

  await Promise.all(writes);
  console.log(`Wrote ${event.Records.length} records to DynamoDB (${TABLE})`);
};

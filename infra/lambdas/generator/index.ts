import { KinesisClient, PutRecordsCommand, PutRecordsRequestEntry } from "@aws-sdk/client-kinesis";
import { ZONES } from "./zones";
import { computeZoneTelemetry, WeatherCondition } from "./model";

const kinesis = new KinesisClient({});

/**
 * Invoked every minute by EventBridge.
 * Computes current telemetry for every zone and publishes to Kinesis.
 * Kinesis Firehose will deliver the records to S3 (cold path).
 * The Processor Lambda will write them to Timestream (hot path).
 */
export const handler = async (): Promise<{ published: number }> => {
  const streamName = process.env.KINESIS_STREAM_NAME!;
  const now = new Date();

  // Weather can be passed as an env var set by the app/ops team,
  // or defaults to "clear". A future iteration could read this from
  // SSM Parameter Store or DynamoDB to allow real-time weather updates.
  const weather = (process.env.WEATHER_CONDITION ?? "clear") as WeatherCondition;

  const kinesisRecords: PutRecordsRequestEntry[] = ZONES.map((zone) => {
    const telemetry = computeZoneTelemetry(zone, now, weather);

    const payload = {
      // identifiers
      zoneId:   zone.id,
      zoneName: zone.name,
      cityId:   zone.cityId,
      // telemetry
      timestamp:        now.toISOString(),
      riskScore:        telemetry.riskScore,
      vehicleCount:     telemetry.vehicleCount,
      pedestrianCount:  telemetry.pedestrianCount,
      speedAvgMph:      telemetry.speedAvgMph,
      congestionIndex:  telemetry.congestionIndex,
      activeCameras:    telemetry.activeCameras,
      totalCameras:     telemetry.totalCameras,
      weather,
    };

    return {
      // Newline delimiter makes each record valid NDJSON for Athena
      Data:         Buffer.from(JSON.stringify(payload) + "\n"),
      PartitionKey: zone.id,
    };
  });

  const result = await kinesis.send(new PutRecordsCommand({
    StreamName: streamName,
    Records:    kinesisRecords,
  }));

  const failed = result.FailedRecordCount ?? 0;
  if (failed > 0) {
    console.warn(`${failed} records failed to publish to Kinesis`);
  }

  console.log(`Published ${kinesisRecords.length - failed}/${kinesisRecords.length} records at ${now.toISOString()}`);
  return { published: kinesisRecords.length - failed };
};

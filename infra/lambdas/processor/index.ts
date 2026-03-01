import {
  TimestreamWriteClient,
  WriteRecordsCommand,
  _Record,
  MeasureValue,
  RejectedRecordsException,
} from "@aws-sdk/client-timestream-write";
import { KinesisStreamEvent, KinesisStreamRecord } from "aws-lambda";

const tsWrite = new TimestreamWriteClient({});

const DB    = process.env.TIMESTREAM_DATABASE!;
const TABLE = process.env.TIMESTREAM_TABLE!;

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

function payloadToRecord(payload: ZonePayload): _Record {
  const measures: MeasureValue[] = [
    { Name: "risk_score",        Value: String(payload.riskScore),       Type: "DOUBLE"  },
    { Name: "vehicle_count",     Value: String(payload.vehicleCount),    Type: "BIGINT"  },
    { Name: "pedestrian_count",  Value: String(payload.pedestrianCount), Type: "BIGINT"  },
    { Name: "speed_avg_mph",     Value: String(payload.speedAvgMph),     Type: "DOUBLE"  },
    { Name: "congestion_index",  Value: String(payload.congestionIndex), Type: "DOUBLE"  },
    { Name: "active_cameras",    Value: String(payload.activeCameras),   Type: "BIGINT"  },
    { Name: "total_cameras",     Value: String(payload.totalCameras),    Type: "BIGINT"  },
    { Name: "weather",           Value: payload.weather,                  Type: "VARCHAR" },
  ];

  return {
    Dimensions: [
      { Name: "zone_id",   Value: payload.zoneId   },
      { Name: "zone_name", Value: payload.zoneName  },
      { Name: "city_id",   Value: payload.cityId    },
    ],
    MeasureName:      "zone_telemetry",
    MeasureValueType: "MULTI",
    MeasureValues:    measures,
    Time:             String(new Date(payload.timestamp).getTime()),
    TimeUnit:         "MILLISECONDS",
  };
}

async function writeRecordsBatch(records: _Record[]): Promise<void> {
  // Timestream limit: 100 records per WriteRecords call
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    try {
      await tsWrite.send(new WriteRecordsCommand({
        DatabaseName: DB,
        TableName:    TABLE,
        Records:      batch,
      }));
    } catch (err) {
      // Log rejected records but don't fail the whole batch
      if (err instanceof RejectedRecordsException && err.RejectedRecords) {
        console.warn(
          `${err.RejectedRecords.length} records rejected:`,
          JSON.stringify(err.RejectedRecords)
        );
      } else {
        throw err;
      }
    }
  }
}

/**
 * Triggered by Kinesis Data Stream.
 * Decodes each record, maps it to a Timestream MULTI-measure record,
 * and writes them in batches of 100.
 */
export const handler = async (event: KinesisStreamEvent): Promise<void> => {
  const records: _Record[] = [];

  for (const rec of event.Records as KinesisStreamRecord[]) {
    const raw = Buffer.from(rec.kinesis.data, "base64").toString("utf-8").trim();
    let payload: ZonePayload;
    try {
      payload = JSON.parse(raw) as ZonePayload;
    } catch {
      console.warn("Failed to parse Kinesis record:", raw.slice(0, 200));
      continue;
    }
    records.push(payloadToRecord(payload));
  }

  if (records.length === 0) return;

  await writeRecordsBatch(records);
  console.log(`Wrote ${records.length} records to Timestream (${DB}.${TABLE})`);
};

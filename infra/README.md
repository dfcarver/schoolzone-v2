# SchoolZone — AWS Data Pipeline Infrastructure

AWS CDK stack that generates real-time school zone traffic time series data,
stores it in a data lake, and serves it to the Next.js application.

## Architecture

```
EventBridge (every 1 min)
    │
    ▼
Generator Lambda          — computes zone telemetry (Gaussian model)
    │
    ▼
Kinesis Data Stream
    ├──► Kinesis Firehose ──► S3 Data Lake   (cold path — Athena/Glue)
    └──► Processor Lambda ──► Timestream      (hot path — live queries)
                                   │
                              Snapshot API Lambda
                                   │
                              Lambda Function URL
                                   │
                           Next.js app (replaces mock JSON)
```

## Prerequisites

- Node.js 20+
- AWS CLI configured (`aws configure`)
- AWS CDK CLI (`npm install -g aws-cdk`)
- An AWS account with permissions to create the resources below

## Setup

```bash
cd infra
npm install

# Bootstrap CDK in your account/region (one-time)
cdk bootstrap

# Preview what will be deployed
cdk diff

# Deploy
cdk deploy
```

After deploying, CDK outputs the **Snapshot API URL**. Copy it.

## Connect the Next.js app

Add the URL to your `.env.local`:

```
NEXT_PUBLIC_AWS_SNAPSHOT_API_URL=https://<id>.lambda-url.<region>.on.aws
```

Restart the dev server. The app will now fetch live data from the pipeline
instead of the static mock JSON files. If the API is unavailable, it falls
back to mock data automatically.

The snapshot API accepts optional query parameters:

| Param     | Values                                          | Default          |
|-----------|-------------------------------------------------|------------------|
| `city`    | `springfield_il`, `khalifa_city_auh`, `mbz_city_auh` | `springfield_il` |
| `weather` | `clear`, `rain`, `fog`                          | `clear`          |

Example: `GET <url>?city=khalifa_city_auh&weather=rain`

## AWS Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| Kinesis Data Stream | `schoolzone-traffic` | Real-time telemetry transport |
| S3 Bucket | `schoolzone-datalake-<account>-<region>` | Cold storage / data lake |
| Kinesis Firehose | `schoolzone-to-datalake` | Stream → S3 delivery |
| Timestream DB | `schoolzone-db` | Hot time-series store (24h memory, 1yr magnetic) |
| Timestream Table | `telemetry` | Zone telemetry records |
| Lambda | `schoolzone-generator` | Traffic data generator |
| Lambda | `schoolzone-processor` | Kinesis → Timestream writer |
| Lambda | `schoolzone-snapshot-api` | LiveState API for the app |
| EventBridge Rule | `schoolzone-generator-schedule` | 1-minute trigger |

## Querying the data lake (Athena)

After data has been flowing for a while, run an AWS Glue Crawler on the S3 bucket
to create a table in the Glue Data Catalog. Then query with Athena:

```sql
SELECT zone_id, zone_name, risk_score, vehicle_count, timestamp
FROM "schoolzone_raw"
WHERE year = '2026' AND month = '03' AND day = '01'
ORDER BY timestamp DESC
LIMIT 100;
```

## Adjusting the weather condition

Set the `WEATHER_CONDITION` environment variable on the Generator Lambda
(`clear`, `rain`, or `fog`) to influence the generated telemetry:

```bash
aws lambda update-function-configuration \
  --function-name schoolzone-generator \
  --environment "Variables={KINESIS_STREAM_NAME=schoolzone-traffic,WEATHER_CONDITION=rain}"
```

## Teardown

```bash
cdk destroy
```

Note: the S3 bucket has `RemovalPolicy.RETAIN` to protect your data lake.
Delete it manually from the AWS Console if needed.

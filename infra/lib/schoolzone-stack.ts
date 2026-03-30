import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";

export class SchoolzoneStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Kinesis Data Stream ───────────────────────────────────────────────────
    // All zone telemetry flows through here in real time
    const trafficStream = new kinesis.Stream(this, "TrafficStream", {
      streamName: "schoolzone-traffic",
      shardCount: 1,
      retentionPeriod: cdk.Duration.hours(24),
      encryption: kinesis.StreamEncryption.MANAGED,
    });

    // ── S3 Data Lake ──────────────────────────────────────────────────────────
    // Long-term cold storage, partitioned by date/hour for Athena queries
    const dataLakeBucket = new s3.Bucket(this, "DataLake", {
      bucketName: `schoolzone-datalake-${this.account}-${this.region}`,
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: "transition-to-ia",
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── DynamoDB — Zone State Table ───────────────────────────────────────────
    // Stores the latest telemetry reading per zone (overwritten each minute).
    // TTL of 10 minutes automatically purges stale records.
    // PK: city_id  SK: zone_id  → single-table current state per city
    const zoneStateTable = new dynamodb.Table(this, "ZoneStateTable", {
      tableName: "schoolzone-zone-state",
      partitionKey: { name: "city_id", type: dynamodb.AttributeType.STRING },
      sortKey:      { name: "zone_id", type: dynamodb.AttributeType.STRING },
      billingMode:  dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Firehose IAM Role ─────────────────────────────────────────────────────
    const firehoseRole = new iam.Role(this, "FirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
      inlinePolicies: {
        KinesisAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "kinesis:GetRecords",
                "kinesis:GetShardIterator",
                "kinesis:DescribeStream",
                "kinesis:ListShards",
                "kinesis:ListStreams",
              ],
              resources: [trafficStream.streamArn],
            }),
          ],
        }),
      },
    });
    dataLakeBucket.grantWrite(firehoseRole);

    // ── Kinesis Firehose → S3 ─────────────────────────────────────────────────
    // Buffers Kinesis records and delivers them to S3 every 60s or 5 MB
    // Partitioned by year/month/day/hour for Athena
    new kinesisfirehose.CfnDeliveryStream(this, "FirehoseToS3", {
      deliveryStreamName: "schoolzone-to-datalake",
      deliveryStreamType: "KinesisStreamAsSource",
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: trafficStream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      extendedS3DestinationConfiguration: {
        bucketArn: dataLakeBucket.bucketArn,
        roleArn: firehoseRole.roleArn,
        prefix:
          "raw/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/",
        errorOutputPrefix:
          "errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 5,
        },
        compressionFormat: "GZIP",
      },
    });

    // ── Shared Lambda config ───────────────────────────────────────────────────
    const lambdaDefaults: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      bundling: {
        // Bundle AWS SDK v3 clients (not included in Node 20 runtime by default)
        externalModules: [],
        minify: true,
        sourceMap: false,
        target: "es2020",
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    };

    // ── Generator Lambda ──────────────────────────────────────────────────────
    // Triggered every minute by EventBridge; publishes zone telemetry to Kinesis
    const generatorFn = new lambdaNodejs.NodejsFunction(this, "Generator", {
      ...lambdaDefaults,
      functionName: "schoolzone-generator",
      entry: path.join(__dirname, "../lambdas/generator/index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      environment: {
        KINESIS_STREAM_NAME: trafficStream.streamName,
      },
    });
    trafficStream.grantWrite(generatorFn);

    // EventBridge rule: fire every 1 minute
    new events.Rule(this, "GeneratorSchedule", {
      ruleName: "schoolzone-generator-schedule",
      description: "Triggers the SchoolZone traffic generator every minute",
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(generatorFn)],
    });

    // ── Processor Lambda (Kinesis → DynamoDB) ────────────────────────────────
    // Reads batches from Kinesis and writes the latest zone state to DynamoDB
    const processorFn = new lambdaNodejs.NodejsFunction(this, "Processor", {
      ...lambdaDefaults,
      functionName: "schoolzone-processor",
      entry: path.join(__dirname, "../lambdas/processor/index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      environment: {
        DYNAMODB_TABLE: zoneStateTable.tableName,
      },
    });

    // Kinesis → Lambda event source
    processorFn.addEventSource(
      new eventsources.KinesisEventSource(trafficStream, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 100,
        bisectBatchOnError: true,
        retryAttempts: 3,
      })
    );

    zoneStateTable.grantWriteData(processorFn);

    // ── Snapshot API Lambda ────────────────────────────────────────────────────
    // Queries DynamoDB for latest zone telemetry and returns a LiveState JSON
    // that matches the exact shape the Next.js app already expects
    const snapshotApiFn = new lambdaNodejs.NodejsFunction(this, "SnapshotApi", {
      ...lambdaDefaults,
      functionName: "schoolzone-snapshot-api",
      entry: path.join(__dirname, "../lambdas/snapshot-api/index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(15),
      environment: {
        DYNAMODB_TABLE: zoneStateTable.tableName,
      },
    });

    zoneStateTable.grantReadData(snapshotApiFn);

    // Lambda Function URL — simpler and cheaper than API Gateway for this use case
    const snapshotUrl = snapshotApiFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.GET],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: cdk.Duration.seconds(60),
      },
    });

    // ── Analytics API Lambda ───────────────────────────────────────────────────
    // Runs Athena queries against the S3 data lake and returns hourly aggregates.
    // Called directly from the Next.js analytics page via Function URL.
    const analyticsApiFn = new lambdaNodejs.NodejsFunction(this, "AnalyticsApi", {
      ...lambdaDefaults,
      functionName: "schoolzone-analytics-api",
      entry: path.join(__dirname, "../lambdas/analytics-api/index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(60),
      environment: {
        ATHENA_RESULTS_BUCKET: `s3://${dataLakeBucket.bucketName}/athena-results/`,
      },
    });

    // Athena permissions
    analyticsApiFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "athena:StartQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:StopQueryExecution",
        "glue:GetTable",
        "glue:GetDatabase",
        "glue:GetPartitions",
      ],
      resources: ["*"],
    }));
    dataLakeBucket.grantReadWrite(analyticsApiFn);

    const analyticsUrl = analyticsApiFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.GET],
        allowedHeaders: ["Content-Type"],
        maxAge: cdk.Duration.seconds(60),
      },
    });

    // ── Outputs ────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "DataLakeBucketName", {
      value: dataLakeBucket.bucketName,
      description: "S3 data lake bucket",
      exportName: "SchoolzoneDataLakeBucket",
    });

    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: zoneStateTable.tableName,
      description: "DynamoDB zone state table",
    });

    new cdk.CfnOutput(this, "KinesisStreamName", {
      value: trafficStream.streamName,
      description: "Kinesis Data Stream name",
    });

    new cdk.CfnOutput(this, "SnapshotApiUrl", {
      value: snapshotUrl.url,
      description:
        "Add this to your Next.js .env.local as NEXT_PUBLIC_AWS_SNAPSHOT_API_URL",
      exportName: "SchoolzoneSnapshotApiUrl",
    });

    new cdk.CfnOutput(this, "AnalyticsApiUrl", {
      value: analyticsUrl.url,
      description:
        "Add this to your Vercel env as NEXT_PUBLIC_AWS_ANALYTICS_API_URL",
      exportName: "SchoolzoneAnalyticsApiUrl",
    });
  }
}

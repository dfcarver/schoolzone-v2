#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SchoolzoneStack } from "../lib/schoolzone-stack";

const app = new cdk.App();

new SchoolzoneStack(app, "SchoolzoneStack", {
  // Set your AWS account and region here, or use environment variables:
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  description: "SchoolZone Digital Twin — traffic data pipeline (Kinesis → Timestream → S3)",
});

import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { S3Client } from "@aws-sdk/client-s3";
import { STSClient } from "@aws-sdk/client-sts";

export const stsClient = new STSClient({ region: "us-east-1" });
export const cloudFormationClient = new CloudFormationClient({
  region: "eu-west-2",
});

export const s3Client = new S3Client({ region: "eu-west-2" });

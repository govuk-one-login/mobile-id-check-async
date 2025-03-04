import { STSClient } from "@aws-sdk/client-sts";
export const stsClient = new STSClient({ region: "us-east-1" });

import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { STSClient } from "@aws-sdk/client-sts";

export const stsClient = new STSClient({ region: "us-east-1" });
export const cloudFormationClient = new CloudFormationClient({
  region: "eu-west-2",
});

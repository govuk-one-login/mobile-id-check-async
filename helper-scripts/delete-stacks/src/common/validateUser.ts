import {
  GetCallerIdentityCommand,
  GetCallerIdentityCommandOutput,
} from "@aws-sdk/client-sts";
import { stsClient } from "./aws-clients.js";

export async function assertUserIdentity() {
  const callerIdentity = await getCallerIdentity();
  assertUserIsAuthenticated(callerIdentity);
}

const getCallerIdentity = async (): Promise<{
  account: string;
  arn: string;
}> => {
  const command = new GetCallerIdentityCommand({});
  const callerIdentity = await stsClient.send(command);
  return getAccountIdAndRoleArn(callerIdentity);
};

const getAccountIdAndRoleArn = (
  callerIdentity: GetCallerIdentityCommandOutput,
): { account: string; arn: string } => {
  if (typeof callerIdentity.Account !== "string")
    throw Error(
      "Cannot validate user. Account property not received from AWS STS.",
    );
  if (typeof callerIdentity.Arn !== "string")
    throw Error(
      "Cannot validate user. Arn property not received from AWS STS.",
    );
  return { account: callerIdentity.Account, arn: callerIdentity.Arn };
};

const assertUserIsAuthenticated = (callerIdentity: {
  account: string;
  arn: string;
}): void => {
  const expectedAccountId = "211125300205";
  if (expectedAccountId !== callerIdentity.account)
    throw Error(
      `You are logged into the wrong AWS account. User logged into ${callerIdentity.account}. Expected user to be in ${expectedAccountId}`,
    );
};

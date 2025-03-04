import { confirm } from "@inquirer/prompts";
import { select } from "@inquirer/prompts";

import {
  GetCallerIdentityCommand,
  GetCallerIdentityCommandOutput,
} from "@aws-sdk/client-sts";
import { stsClient } from "../common/aws/aws-clients.js";

const allowedAccounts = [
  "dev",
  "build",
  "staging",
  "integration",
  "production",
] as const;

export type AwsAccount = (typeof allowedAccounts)[number];

const familiarAccountNameToAccountId: Record<AwsAccount, string> = {
  dev: "211125300205",
  build: "058264551042",
  staging: "730335288219",
  integration: "992382392501",
  production: "339712924890",
};

export const selectAwsEnvironment = async (): Promise<void> => {
  const desiredAccount = await getDesiredAWSAccountFromUser();
  await confirmUserSelectionOrExit(desiredAccount);
  setAwsProfile(desiredAccount);
  await validateAccountIdAgainstDesiredAccountOrExit(
    familiarAccountNameToAccountId[desiredAccount],
  );
};

const getDesiredAWSAccountFromUser = async (): Promise<AwsAccount> => {
  const response = await select<AwsAccount>({
    choices: allowedAccounts,
    message: "Which account do you want to use?",
  })

  return response
};

const confirmUserSelectionOrExit = async (
  desiredAwsAccount: AwsAccount,
): Promise<void> => {
  const response = await confirm({
    message: `You have selected ${desiredAwsAccount}. Would you like to continue with this account?`,
  });

  if (response !== true) exitApplicationWithError();
};

const exitApplicationWithError = (): void => {
  console.log("Exiting application");
  process.exit(0);
};
const exitApplicationWithoutError = (): void => {
  console.log("Exiting application");
  process.exit(1);
};

const setAwsProfile = (confirmedAwsAccount: AwsAccount): void => {
  process.env.AWS_PROFILE = `async-${confirmedAwsAccount}`;
  console.log(`Using the AWS Profile: ${process.env.AWS_PROFILE}`);
};

const validateAccountIdAgainstDesiredAccountOrExit = async (
  expectedAccountId: string,
): Promise<void> => {
  try {
    const callerIdentity = await getCallerIdentity();
    assertUserIsAuthenticated(expectedAccountId, callerIdentity);
  } catch (error: unknown) {
    console.error("There was an error validating the AWS Profile corresponds to the correct AWS Account Id. Check if the AWS Profile has been configured in ~./aws/config")
    if(error instanceof Error) {
      console.error(error.message)
    }
    exitApplicationWithError()
  }

};

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

const assertUserIsAuthenticated = (
  expectedAccountId: string,
  callerIdentity: {
    account: string;
    arn: string;
  },
): void => {
  if (expectedAccountId !== callerIdentity.account)
    console.error( `You are logged into the wrong AWS account. User logged into ${callerIdentity.account}. Expected user to be logged into ${expectedAccountId}`)
    process.exit(1)
};

import {
  GetCallerIdentityCommand,
  GetCallerIdentityCommandOutput,
} from "@aws-sdk/client-sts";
import { stsClient } from "./aws-clients.js";

export async function assertUserIsAuthenticatedToDev() {
  const command = new GetCallerIdentityCommand({});

  let data: GetCallerIdentityCommandOutput;
  try {
    data = await stsClient.send(command);
  } catch (error) {
    console.log("Failed to call STS");
    throw error;
  }

  const roleArn = data.Arn;
  const accountId = data.Account;

  const expectedAccountId = "211125300205";

  if (accountId !== expectedAccountId) {
    throw Error(
      `You are authenticated in the wrong account! Expected account: ${expectedAccountId}, but found account: ${accountId}`,
    );
  }

  console.log(`You are authenticated with the AWS role: ${roleArn}`);
}

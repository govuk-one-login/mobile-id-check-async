import {
  DeleteStackCommand,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

import { waitUntilStackDeleteComplete } from "@aws-sdk/client-cloudformation";
import { FailureResult, Results } from "./results.js";
import { cloudFormationClient } from "./aws-clients.js";

export const deleteStacks = async (stackNames: string[]): Promise<Results> => {
  const results: Results = [];
  for (const stackName of stackNames) {
    try {
      await deleteStack(stackName);
      results.push({ stackName, status: "SUCCESS" });
    } catch (error) {
      const failureResult = buildDeleteCommandFailureResult(stackName, error);
      results.push(failureResult);
    }
  }
  return results;
};

const deleteStack = async (stackName: string): Promise<void> => {
  logStartingMessage(stackName);
  await sendDeleteStackCommand(stackName);
  await waitUntilStackDeleteComplete(
    { client: cloudFormationClient, maxWaitTime: 600 },
    { StackName: stackName },
  );
  logCompletedMessage(stackName);
};

const logStartingMessage = (stackName: string): void => {
  console.log("\n", `Deleting ${stackName}...this may take some time`);
};

const sendDeleteStackCommand = async (stackName: string): Promise<void> => {
  await cloudFormationClient.send(buildDeleteStackCommand(stackName));
};

const buildDeleteStackCommand = (stackName: string): DeleteStackCommand => {
  return new DeleteStackCommand({
    StackName: stackName,
  });
};

const logCompletedMessage = (stackName: string): void => {
  console.log("\n", `Deleted ${stackName}`);
};

const buildDeleteCommandFailureResult = (
  stackName: string,
  error: unknown,
): FailureResult => {
  let reason = "Failed to delete " + stackName + ".";
  if (error instanceof Error) {
    reason = reason + " " + error.message;
  }
  return {
    stackName,
    status: "FAILURE",
    reason,
  };
};

export const getDeployedStackNames = async (): Promise<string[]> => {
  const describeStacksCommand = new DescribeStacksCommand();
  const response = await cloudFormationClient.send(describeStacksCommand);
  if (!response.Stacks)
    throw Error("No stacks deployed into the account. This is not expected.");
  return response.Stacks.map((stacks) => {
    if (!stacks.StackName)
      throw Error(
        "The stack does not have a StackName property. This is not expected",
      );
    return stacks.StackName;
  });
};

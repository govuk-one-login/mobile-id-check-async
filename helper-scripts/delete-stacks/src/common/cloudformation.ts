import {
  DeleteStackCommand,
  StackStatus,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { FailureResult, Results } from "./results.js";
import { cloudFormationClient } from "./aws-clients.js";

const buildDeleteStackCommand = (stackName: string): DeleteStackCommand => {
  return new DeleteStackCommand({
    StackName: stackName,
  });
};

const getStackStatus = async (
  stackName: string,
): Promise<StackStatus | undefined> => {
  const describeStacksCommand = new DescribeStacksCommand({
    StackName: stackName,
  });
  const response = await cloudFormationClient.send(describeStacksCommand);
  if (!response.Stacks)
    throw Error("No stacks deployed into the account. This is not expected.");
  if (response.Stacks.length > 1)
    throw Error("Multiple stacks returend. This is not expected");
  if (!response.Stacks[0].StackName)
    throw Error("Stack has no StackName. This is not expected");
  return response.Stacks[0].StackStatus;
};

const continuePollingStackStatus = (
  stackStatus: StackStatus | undefined,
): boolean => {
  return stackStatus === StackStatus.DELETE_IN_PROGRESS;
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

const sendDeleteStackCommand = async (stackName: string): Promise<void> => {
  await cloudFormationClient.send(buildDeleteStackCommand(stackName));
};

const isSuccessStackStatus = (
  stackStatus: StackStatus | undefined,
): boolean => {
  return stackStatus === StackStatus.DELETE_COMPLETE;
};

export const deleteStacks = async (stackNames: string[]): Promise<Results> => {
  const results: Results = [];
  for (const stackName of stackNames) {
    let commandSentSuccessfully: boolean = true;
    try {
      await sendDeleteStackCommand(stackName);
    } catch (error) {
      const failureResult = buildDeleteCommandFailureResult(stackName, error);
      results.push(failureResult);
      commandSentSuccessfully = false;
    }
    if ((commandSentSuccessfully = false)) {
      const stackStatus = await getStackStatus(stackName);
      if (!continuePollingStackStatus(stackStatus)) {
        if (isSuccessStackStatus(stackStatus)) {
          results.push({ status: "SUCCESS", stackName });
        } else {
          results.push({
            status: "FAILURE",
            stackName,
            reason:
              "Stack in the following status and cannot proceed: " +
              stackStatus,
          });
        }
        break;
      }
    }
  }
  return results;
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

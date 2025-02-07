import {
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";

import { waitUntilStackDeleteComplete } from "@aws-sdk/client-cloudformation";
import { cloudFormationClient } from "./aws-clients.js";
import { deleteObject } from "./s3.js";

export const deleteStack = async (stackName: string): Promise<void> => {
  logStartingMessage(stackName);
  await deleteVersionedResources(stackName);
  await sendDeleteStackCommand(stackName);
  await waitUntilStackDeleteComplete(
    { client: cloudFormationClient, maxWaitTime: 10000 },
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

const deleteVersionedResources = async (stackName: string): Promise<void> => {
  const bucketIds = await getDeployedS3BucketIds(stackName);
  if (bucketIds.length < 1) return;
  await deleteBuckets(bucketIds);
};

const getDeployedS3BucketIds = async (stackName: string): Promise<string[]> => {
  const listStackResourcesCommand = new ListStackResourcesCommand({
    StackName: stackName,
  });
  const resourcesCommandOutput = await cloudFormationClient.send(
    listStackResourcesCommand,
  );
  if (!resourcesCommandOutput.StackResourceSummaries)
    throw Error(
      "Could not find Cloudformation resources for the stack. This is likely an error",
    );

  return resourcesCommandOutput.StackResourceSummaries.filter((resource) => {
    return (
      resource.ResourceType === "AWS::S3::Bucket" &&
      resource.ResourceStatus !== "DELETE_COMPLETE"
    );
  }).map((resource) => {
    return resource.PhysicalResourceId!;
  });
};

const deleteBuckets = async (bucketIds: string[]): Promise<void> => {
  await Promise.all(bucketIds.map((bucketId) => deleteObject(bucketId)));
};

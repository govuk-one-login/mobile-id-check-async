import { DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { buildStackFailureResultFromError, Results } from "../../common/results.js";
import { Application } from "./stackMethod.js";
import { cloudFormationClient } from "../../common/aws/aws-clients.js";
import inquirer from "inquirer";
import { deleteStack } from "../../common/aws/cloudformation.js";

const cloudfrontStackNameIdentifier = "-async-backend-cf-dist";

export const deleteStackGroupApplication: Application = {
  getNames: async (deployedStackNames: string[]): Promise<string[]> => {
    const describeStacksCommand = new DescribeStacksCommand();
    const response = await cloudFormationClient.send(describeStacksCommand);

    if (!response.Stacks) throw Error;
    const stackNames = response.Stacks?.filter((stack) => {
      if (stack.StackName) {
        return stack.StackName.includes(cloudfrontStackNameIdentifier);
      }
    }).map((stack) => {
      return stripCfString(stack.StackName!);
    });

    const answer = await inquirer.prompt([
      {
        type: "list",
        choices: stackNames,
        message: "Select an option",
        name: "selectedStackName",
      },
    ]);

    return buildOrderedStackNamesForDeletion(
      answer["selectedStackName"],
      deployedStackNames,
    );
  },
  deleteStacks: async (stackNames: string[]): Promise<Results> => {
    const results: Results = [];
    for (const stackName of stackNames) {
      try {
        await deleteStack(stackName);
        results.push({ stackName, status: "SUCCESS" });
      } catch (error) {
        console.log(error);
        const failureResult = buildStackFailureResultFromError(
          stackName,
          error,
        );
        results.push(failureResult);
      }
    }
    return results;
  },
};
const stripCfString = (stackName: string): string => {
  return stackName.replace(cloudfrontStackNameIdentifier, "");
};

const buildOrderedStackNamesForDeletion = (
  baseStackName: string,
  deployedStackNames: string[],
): string[] => {
  const fullStackNames = buildFullStackNames(baseStackName);
  return fullStackNames.filter((stackName) => {
    return deployedStackNames.includes(stackName)
  });
};

const buildFullStackNames = (
  baseStackName: string,
): [
  stsStackName: string,
  backendStackName: string,
  cfDistStackName: string,
] => {
  return [
    `${baseStackName}-test-resources`,
    `${baseStackName}-async-backend`,
    `${baseStackName}-async-backend-cf-dist`,
  ];
  //This array is ordered. Do not update. n.b it is possible to delete the sts-mock and async-backend stacks at the same time.
};

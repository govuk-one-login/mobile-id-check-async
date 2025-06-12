import { chalk, echo } from "zx";
import {
  areYouHappyToDelete,
  askForBaseStackNames,
  askToAddMoreBaseStacks,
  askWhichStacksToDelete,
} from "./prompts.js";
import { protectedStacks } from "../protectedStacks.js";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

export interface PrioritisedStacks {
  stacksToDeleteOrder01: string[];
  stacksToDeleteOrder02: string[];
  stacksToDeleteOrder03: string[];
}

export const getStacks = async (): Promise<PrioritisedStacks> => {
  const baseStackName = await getBaseStackNames();
  const candidates = await getStackCandidates(baseStackName);
  const selectedStacks = await selectStacksToDelete(candidates);

  await confirmStacks(selectedStacks);
  checkIfProtectedStack(selectedStacks, protectedStacks);
  return prioritiseStacks(selectedStacks);
};

const getBaseStackNames = async (): Promise<string[]> => {
  const baseStackNames: string[] = [];
  let addAnother = true;
  while (addAnother) {
    const { baseStackName } = await askForBaseStackNames(baseStackNames);
    baseStackNames.push(baseStackName);

    echo("");
    const { choice } = await askToAddMoreBaseStacks();
    if (choice === "No") {
      addAnother = false;
    }
    echo("");
  }
  return baseStackNames;
};

const getStackCandidates = async (
  baseStackNames: string[],
): Promise<string[]> => {
  const candidates: string[] = [];

  for (const stackName of baseStackNames) {
    const potentialStacks = [
      `${stackName}-test-resources`,
      `${stackName}-async-backend`,
      `${stackName}-async-backend-cf-dist`,
    ];

    for (const stack of potentialStacks) {
      try {
        await doesStackExist(stack);
        candidates.push(stack);
      } catch {
        echo(chalk.dim.italic(`No stack found with name: ${stack}`));
      }
    }
  }

  return candidates;
};

const doesStackExist = async (stackName: string): Promise<void> => {
  const cloudFormation = new CloudFormationClient({});
  await cloudFormation.send(
    new DescribeStacksCommand({
      StackName: stackName,
    }),
  );
};

const selectStacksToDelete = async (
  candidates: string[],
): Promise<string[]> => {
  echo(
    chalk.italic.dim(
      [
        "",
        "Please note, the following stack dependencies exist:",
        "- The test-resource stack depends on the backend stack",
        "- The backend stack depends on the backend-cf-dist stack",
        "",
      ].join("\n"),
    ),
  );

  let answer;
  try {
    answer = await askWhichStacksToDelete(candidates);
  } catch (error) {
    echo(chalk.red("Error selecting stacks to delete. Error: ", error));
    process.exit(1);
  }
  return answer.stacksToDelete;
};

const confirmStacks = async (stacks: string[]): Promise<void> => {
  echo("");
  if (stacks.length === 0) {
    echo(chalk.red("No stacks selected for deletion, please try again"));
    echo("");
    process.exit(1);
  }

  youAreAboutToDeleteMessage(stacks);
  const { isHappy } = await areYouHappyToDelete();
  if (!isHappy) {
    echo("");
    echo(chalk.yellow("Exiting"));
    process.exit(0);
  } else {
    echo("");
    echo(chalk.dim.italic("Continuing..."));
  }
};

const youAreAboutToDeleteMessage = (stacks: string[]): void => {
  echo(chalk.bold("You are about to delete the following stacks:"));
  stacks.forEach((stackName) => echo(`- ${stackName}`));
  echo("");
};

const checkIfProtectedStack = (stacks: string[], protectedStacks: string[]) => {
  stacks.forEach(async (stackName) => {
    if (protectedStacks.includes(stackName)) {
      echo(chalk.red(`It is not permitted to delete stack: ${stackName}`));
      echo(chalk.red("Please try again without including this stack"));
      process.exit(1);
    }
    return;
  });
};

const prioritiseStacks = (candidates: string[]): PrioritisedStacks => {
  const stacksToDeleteOrder01: string[] = [];
  const stacksToDeleteOrder02: string[] = [];
  const stacksToDeleteOrder03: string[] = [];

  for (const stackName of candidates) {
    if (stackName.includes("cf-dist")) {
      stacksToDeleteOrder03.push(stackName);
    } else if (stackName.includes("test-resources")) {
      stacksToDeleteOrder01.push(stackName);
    } else {
      stacksToDeleteOrder02.push(stackName);
    }
  }

  return {
    stacksToDeleteOrder01,
    stacksToDeleteOrder02,
    stacksToDeleteOrder03,
  };
};

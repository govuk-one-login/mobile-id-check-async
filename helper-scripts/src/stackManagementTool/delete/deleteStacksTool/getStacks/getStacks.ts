import { $, echo } from "zx";
import { PrioritisedStacks } from "../deleteStacksTool.js";
import {
  areYouHappyToDeleteMessage,
  askForBaseStackNames,
  askToAddMoreBaseStacks,
  askWhichStacksToDelete,
  cannotDeleteProtectStackErrorMessage,
  continueDimMessage,
  exitingToolWarningMessage,
  noStackForBaseStackNameInfoMessage,
  noStacksSelectedErrorMessage,
  selectingStacksErrorMessage,
  youAreAboutToDeleteMessage,
} from "./prompts.js";
import { protectedStacks } from "../../../protectedStacks/protectedStacks.js";

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

const doesStackExist = async (stackName: string): Promise<void> => {
  await $`aws cloudformation describe-stacks --stack-name ${stackName} 2>/dev/null`;
};

const getStackCandidates = async (
  baseStackNames: string[],
): Promise<string[]> => {
  const candidates: string[] = [];

  for (const stackName of baseStackNames) {
    const testResourcesStackName = `${stackName}-test-resources`;
    const backendStackName = `${stackName}-async-backend`;
    const backendCfStackName = `${stackName}-async-backend-cf-dist`;

    try {
      await doesStackExist(testResourcesStackName);
      candidates.push(testResourcesStackName);
    } catch {
      noStackForBaseStackNameInfoMessage("test-resource", stackName);
    }

    try {
      await doesStackExist(backendStackName);
      candidates.push(backendStackName);
    } catch {
      noStackForBaseStackNameInfoMessage("backend", stackName);
    }

    try {
      await doesStackExist(backendCfStackName);
      candidates.push(backendCfStackName);
    } catch {
      noStackForBaseStackNameInfoMessage("backend-cf-dist", stackName);
    }
  }

  return candidates;
};

const selectStacksToDelete = async (
  candidates: string[],
): Promise<string[]> => {
  echo("");
  let answer;

  try {
    answer = await askWhichStacksToDelete(candidates);
  } catch (error) {
    selectingStacksErrorMessage(error);
    process.exit(1);
  }
  return answer.stacksToDelete;
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

const confirmStacks = async (stacks: string[]): Promise<void> => {
  echo("");
  if (stacks.length === 0) {
    noStacksSelectedErrorMessage();
    process.exit(1);
  }

  youAreAboutToDeleteMessage(stacks);
  const { isHappy } = await areYouHappyToDeleteMessage();
  if (!isHappy) {
    exitingToolWarningMessage();
    process.exit(0);
  } else {
    continueDimMessage();
  }
};

const checkIfProtectedStack = (stacks: string[], protectedStacks: string[]) => {
  stacks.forEach(async (stackName) => {
    if (protectedStacks.includes(stackName)) {
      cannotDeleteProtectStackErrorMessage(stackName);
      process.exit(1);
    }
    return;
  });
};

export const getStacks = async (): Promise<PrioritisedStacks> => {
  const selectedStacks: string[] = [];

  const baseStackName = await getBaseStackNames();
  const candidates = await getStackCandidates(baseStackName);
  selectedStacks.push(...(await selectStacksToDelete(candidates)));

  await confirmStacks(selectedStacks);
  checkIfProtectedStack(selectedStacks, protectedStacks);

  return prioritiseStacks(selectedStacks);
};

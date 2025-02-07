import inquirer from "inquirer";
import { $ } from "zx";

console.log("Hello, world!");

const getBaseStackName = async (): Promise<string> => {
  const { baseStackName } = await inquirer.prompt<{ baseStackName: string }>([
    {
      type: "input",
      name: "baseStackName",
      message: "Provide a base stack name",
    },
  ]);

  return baseStackName;
};

const doesStackExist = async (stackName: string): Promise<void> => {
  await $`aws cloudformation describe-stacks --stack-name ${stackName} 2>/dev/null`;
};

const getStackCandidates = async (baseStackName: string): Promise<string[]> => {
  const candidates: string[] = [];

  const stsMockStackName = `${baseStackName}-sts-mock`;
  const backendStackName = `${baseStackName}-async-backend`;
  const backendCfStackName = `${baseStackName}-async-backend-cf-dist`;

  try {
    await doesStackExist(stsMockStackName);
    candidates.push(stsMockStackName);
  } catch (error) {
    console.log("No STS mock stack");
  }

  try {
    await doesStackExist(backendStackName);
    candidates.push(backendStackName);
  } catch (error) {
    console.log("No backend stack");
  }

  try {
    await doesStackExist(backendCfStackName);
    candidates.push(backendCfStackName);
  } catch (error) {
    console.log("No backend cf stack");
  }

  return candidates;
};

const selectStacksToDelete = async (
  candidates: string[],
): Promise<string[]> => {
  const { stacksToDelete } = await inquirer.prompt<{
    stacksToDelete: string[];
  }>([
    {
      type: "checkbox",
      name: "stacksToDelete",
      message: "Confirm which of the following stacks you want to delete",
      choices: candidates,
    },
  ]);

  return stacksToDelete;
};

const prioritiseStacks = (candidates: string[]): PrioritisedStacks => {
  const stacksToDeleteOrder01: string[] = [];
  const stacksToDeleteOrder02: string[] = [];

  for (const stackName of candidates) {
    if (stackName.includes("cf-dist")) {
      stacksToDeleteOrder02.push(stackName);
    } else {
      stacksToDeleteOrder01.push(stackName);
    }
  }
  console.log("01", stacksToDeleteOrder01);
  console.log("02", stacksToDeleteOrder02);

  return {
    stacksToDeleteOrder01,
    stacksToDeleteOrder02,
  };
};

try {
  const baseStackName = await getBaseStackName();
  const candidates = await getStackCandidates(baseStackName);
  console.log("candidates", candidates);
  console.log("what did we pick", await selectStacksToDelete(candidates));
  prioritiseStacks(candidates);
} catch (error: unknown) {
  console.log("There was an error. Error:", error);
}

interface PrioritisedStacks {
  stacksToDeleteOrder01: string[];
  stacksToDeleteOrder02: string[];
}

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

const selectStacksToDelete = async (
  candidates: StackToDeleteCandidates,
): Promise<StackToDelete> => {
  const { priorityOneStacksToDelete } = await inquirer.prompt<{
    priorityOneStacksToDelete: string[];
  }>([
    {
      type: "checkbox",
      name: "priorityOneStacksToDelete",
      message: "Confirm which of the following stacks you want to delete",
      choices: candidates.priorityOneCandidate,
    },
  ]);

  console.log();

  const { priorityZeroStacksToDelete } = await inquirer.prompt<{
    priorityZeroStacksToDelete: string[];
  }>([
    {
      type: "checkbox",
      name: "priorityZeroStacksToDelete",
      message: "Confirm which of the following stacks you want to delete",
      choices: candidates.priorityZeroCandidate,
    },
  ]);

  return {
    priorityOneStacksToDelete,
    priorityZeroStacksToDelete,
  };
};

const getEnvironment = async (
  baseStackName: string,
): Promise<StackToDeleteCandidates> => {
  const priorityZeroCandidate: string[] = [];
  const priorityOneCandidate: string[] = [];

  const stsMockStackName = `${baseStackName}-sts-mock`;
  const backendStackName = `${baseStackName}-async-backend`;
  const backendCfStackName = `${baseStackName}-async-backend-cf-dist`;

  try {
    await doesStackExist(stsMockStackName);
    priorityOneCandidate.push(stsMockStackName);
  } catch (error) {
    console.log("No STS mock stack");
  }

  try {
    await doesStackExist(backendStackName);
    priorityOneCandidate.push(backendStackName);
  } catch (error) {
    console.log("No backend stack");
  }

  try {
    await doesStackExist(backendCfStackName);
    priorityZeroCandidate.push(backendCfStackName);
  } catch (error) {
    console.log("No backend cf stack");
  }

  return {
    priorityZeroCandidate,
    priorityOneCandidate,
  };
};

try {
  const baseStackName = await getBaseStackName();
  const candidates = await getEnvironment(baseStackName);
  console.log("candidates", candidates);
  console.log("what did we pick", await selectStacksToDelete(candidates));
} catch (error: unknown) {
  console.log("There was an error. Error:", error);
}

interface StackToDeleteCandidates {
  priorityZeroCandidate: string[];
  priorityOneCandidate: string[];
}

interface StackToDelete {
  priorityZeroStacksToDelete: string[];
  priorityOneStacksToDelete: string[];
}

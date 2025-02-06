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
  await $`aws cloudformation describe-stacks --stack-name ${stackName} 2>/dev/null`
}

const getEnvironment = async (
  baseStackName: string,
): Promise<StackToDelete> => {
  const priorityZero: string[] = [];
  const priorityOne: string[] = [];

  const stsMockStackName = `${baseStackName}-sts-mock`;
  const backendStackName = `${baseStackName}-async-backend`;
  const backendCfStackName = `${baseStackName}-async-backend-cf-dist`;

  try {
    await doesStackExist(stsMockStackName);
    priorityOne.push(stsMockStackName);
  } catch (error) {
    console.log("No STS mock stack");
  }

  try {
    await doesStackExist(backendStackName);
    priorityOne.push(backendStackName);
  } catch (error) {
    console.log("No backend stack");
  }

  try {
    await doesStackExist(backendCfStackName);
    priorityZero.push(backendCfStackName);
  } catch (error) {
    console.log("No backend cf stack");
  }

  return {
    priorityZero,
    priorityOne,
  };
};

try {
  const baseStackName = await getBaseStackName();
  console.log(await getEnvironment(baseStackName));
} catch (error: unknown) {
  console.log("There was an error. Error:", error);
}

interface StackToDelete {
  priorityZero: string[];
  priorityOne: string[];
}

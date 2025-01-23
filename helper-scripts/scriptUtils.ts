import { $, echo, sleep } from "zx";

const checkStackExists = async (stackName: string): Promise<void> => {
  try {
    await $`aws cloudformation describe-stacks --stack-name ${stackName}`;
  } catch (error: unknown) {
    echo(
      `there was a problem partner when checking stack: ${stackName}. The error was: ${error}`,
    );
    process.exit(1);
  }
  return;
};

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $`./delete_stack.sh ${stackName}`;
  } catch (error: unknown) {
    echo(`error deleting stack ${stackName}. Error: ${error}`);
    process.exit(1);
  }
};

const mockCheckStackExists = async (stackName: string): Promise<void> => {
  echo(`Pretending to look up this stack to ensure it exists: ${stackName}`);
  await sleep(1000);
  return;
};

const mockDeleteStack = async (stackName: string): Promise<void> => {
  echo(`Pretending to successfully delete ${stackName} stack`);
  await sleep(2000);
  return;
};

export const deleteStacks = async (stacks: string[][]): Promise<void> => {
  for (const arr of stacks) {
    for (const value of arr) {
      echo(`Checking if ${value} exists`);
      await mockCheckStackExists(value);
      echo(`Attempting to delete stack: ${value}`);
      await mockDeleteStack(value);
    }
  }
};

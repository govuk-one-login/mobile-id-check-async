import { $, echo, question, sleep } from "zx";

const checkStackExists = async (stackName: string): Promise<void> => {
  try {
    await $`aws cloudformation describe-stacks --stack-name ${stackName}`;
  } catch (error: unknown) {
    echo(`Cannot find stack: ${stackName}. Error: ${error}`);
    process.exit(1);
  }
  return;
};

export const confirmStackNames = async (stacks: string[][]): Promise<void> => {
  echo("Please confirm you are happy to delete the following stacks...");
  for (const arr of stacks) {
    echo("");
    arr.forEach((stackName) => {
      echo(stackName);
    });
    echo("");
    const areStacksCorrect = (
      await question("Are you sure you want to delete these stacks? [Y/n]")
    )
      .trim()
      .toLowerCase();
    echo("");
    if (areStacksCorrect === "n") {
      echo("");
      echo("Please update stack names and try again");
      process.exit(1);
    }
  }
};

export const validateStacks = async (stacks: string[][]): Promise<void> => {
  for (const arr of stacks) {
    arr.forEach(async (stackName) => {
      await mockCheckStackExists(stackName);
    });
  }

  await confirmStackNames(stacks);
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
  await sleep(1000);
  return;
};

const mockDeleteStack = async (stackName: string): Promise<void> => {
  await sleep(2000);
  return;
};

export const deleteStacks = async (stacks: string[][]): Promise<void> => {
  for (const arr of stacks) {
    for (const value of arr) {
      echo(`Attempting to delete stack: ${value}`);
      await mockDeleteStack(value);
    }
  }
};

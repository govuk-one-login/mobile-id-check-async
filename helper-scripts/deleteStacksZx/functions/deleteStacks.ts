import { $, echo } from "zx";

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $`./deleteStacksZx/functions/delete_stack.sh ${stackName}`;
  } catch (error: unknown) {
    echo(`error deleting stack ${stackName}. Error: ${error}`);
    process.exit(1);
  }
};

export const deleteStacks = async (stacks: string[][]): Promise<void> => {
  for (const arr of stacks) {
    for (const value of arr) {
      echo(`Attempting to delete stack: ${value}`);
      await deleteStack(value);
    }
  }
};

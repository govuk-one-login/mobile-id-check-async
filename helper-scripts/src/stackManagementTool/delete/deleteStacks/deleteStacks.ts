import { $ } from "zx";
import { PrioritisedStacks } from "../deleteStacksTool.js";
import {
  deletedStackMessage,
  deletingStackMessage,
  unableToDeleteStackErrorMessage,
} from "./prompts.js";

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $`./delete_stack_no_prompt.sh ${stackName}`;
  } catch (error: unknown) {
    unableToDeleteStackErrorMessage(error, stackName);
    process.exit(1);
  }
};

export const deleteStacks = async (
  stacks: PrioritisedStacks,
): Promise<void> => {
  const {
    stacksToDeleteOrder01,
    stacksToDeleteOrder02,
    stacksToDeleteOrder03,
  } = stacks;

  await Promise.all(
    stacksToDeleteOrder01.map(async (stackName) => {
      deletingStackMessage(stackName);
      await deleteStack(stackName);
      deletedStackMessage(stackName);
    }),
  );

  await Promise.all(
    stacksToDeleteOrder02.map(async (stackName) => {
      deletingStackMessage(stackName);
      await deleteStack(stackName);
      deletedStackMessage(stackName);
    }),
  );
  await Promise.all(
    stacksToDeleteOrder03.map(async (stackName) => {
      deletingStackMessage(stackName);
      await deleteStack(stackName);
      deletedStackMessage(stackName);
    }),
  );
};

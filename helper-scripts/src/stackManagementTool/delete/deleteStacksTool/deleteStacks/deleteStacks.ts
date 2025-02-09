import { $ } from "zx";
import { PrioritisedStacks } from "../getStacks/getStacks.js";
import {
  deletedStackMessage,
  deletingStackMessage,
  unableToDeleteStackErrorMessage,
} from "./prompts.js";

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

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $({
      signal: new AbortController().signal,
    })`./delete_stack_no_prompt.sh ${stackName}`;
  } catch (error: unknown) {
    unableToDeleteStackErrorMessage(error, stackName);
    process.exit(1);
  }
};

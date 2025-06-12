import { $, chalk, echo } from "zx";
import { PrioritisedStacks } from "../getStacks/getStacks.js";

export const deleteCloudFormationStacks = async (
  stacks: PrioritisedStacks,
): Promise<void> => {
  const {
    stacksToDeleteOrder01,
    stacksToDeleteOrder02,
    stacksToDeleteOrder03,
  } = stacks;

  await deleteStacksInParallel(stacksToDeleteOrder01);
  await deleteStacksInParallel(stacksToDeleteOrder02);
  await deleteStacksInParallel(stacksToDeleteOrder03);
};

const deleteStacksInParallel = async (stackNames: string[]): Promise<void> => {
  await Promise.all(
    stackNames.map(async (stackName) => {
      echo("");
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo("");
      echo(chalk.green.bold(`${stackName} stack deleted`));
      echo("");
    }),
  );
};

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $({
      signal: new AbortController().signal,
    })`./delete_stack.sh ${stackName}`;
  } catch (error: unknown) {
    echo(chalk.red(`Unable to delete stack: ${stackName}`));
    echo(chalk.red(`Error: ${error}`));
    process.exit(1);
  }
};

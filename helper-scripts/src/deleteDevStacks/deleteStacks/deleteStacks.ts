import { $, chalk, echo } from "zx";
import { PrioritisedStacks } from "../deleteDevStacks.js";

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $`./src/james_delete_stack.sh ${stackName}`;
  } catch (error: unknown) {
    echo(chalk.red(`Unable to delete stack: ${stackName}`));
    echo(chalk.red(`Error: ${error}`));
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
      echo("");
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.green.bold(`${stackName} stack deleted`));
      echo("");
    }),
  );

  await Promise.all(
    stacksToDeleteOrder02.map(async (stackName) => {
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.green.bold(`${stackName} stack deleted`));
      echo("");
    }),
  );
  await Promise.all(
    stacksToDeleteOrder03.map(async (stackName) => {
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.green.bold(`${stackName} stack deleted`));
      echo("");
    }),
  );
};

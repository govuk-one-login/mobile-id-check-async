import { $, chalk, echo } from "zx";
import { emptyLine } from "../helpers/formatting";

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $`./deleteStacksZx/functions/delete_stack.sh ${stackName}`;
  } catch (error: unknown) {
    echo(chalk.red(`Unabled to delete: ${stackName}`));
    echo(chalk.red(`Error: ${error}`));
    process.exit(1);
  }
};

export const deleteStacks = async (stacks: string[][]): Promise<void> => {
  for (const arr of stacks) {
    for (const stackName of arr) {
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.bold(`${stackName} deleted`));
      emptyLine();
    }
  }
};

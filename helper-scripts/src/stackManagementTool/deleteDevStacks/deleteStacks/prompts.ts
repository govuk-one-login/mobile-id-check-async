import { chalk, echo } from "zx";

export const unableToDeleteStackErrorMessage = (
  error: unknown,
  stackName: string,
): void => {
  echo(chalk.red(`Unable to delete stack: ${stackName}`));
  echo(chalk.red(`Error: ${error}`));
};

export const deletingStackMessage = (stackName: string): void => {
  echo("");
  echo(`Deleting stack: ${stackName}`);
};

export const deletedStackMessage = (stackName: string): void => {
  echo(chalk.green.bold(`${stackName} stack deleted`));
  echo("");
};

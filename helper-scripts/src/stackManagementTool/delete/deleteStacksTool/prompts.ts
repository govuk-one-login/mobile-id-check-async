import { echo, chalk } from "zx";

export const runningStackDeletionToolMessage = (): void => {
  echo(chalk.italic("Running stack deletion tool..."));
  echo("");
};

export const deleteStacksToolErrorMessage = (error: unknown): void => {
  echo(chalk.red("There was an error. Error:", error));
};

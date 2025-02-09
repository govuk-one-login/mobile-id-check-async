import { echo, chalk } from "zx";

export const deleteStacksToolErrorMessage = (error: unknown): void => {
  echo(chalk.red("There was an error. Error:", error));
};

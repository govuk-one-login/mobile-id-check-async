import { chalk, echo } from "zx";

export const errorDeployingStacksMessage = (error: unknown): void => {
  echo("");
  echo(chalk.red("Error deploying stacks:"));
  echo(chalk.red(`- ${error}`));
};

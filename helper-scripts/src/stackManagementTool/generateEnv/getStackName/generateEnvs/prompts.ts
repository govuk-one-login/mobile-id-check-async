import { echo, chalk } from "zx";

export const successfullyGeneratedBothEnvsMessage = (
  baseStackName: string,
): void => {
  echo("");
  echo(
    chalk.green.bold(
      `Successfully generated .env files for ${baseStackName}-async-backend and ${baseStackName}-test-resources`,
    ),
  );
};

export const successfullyGeneratedEnvMessage = (stackName: string): void => {
  echo("");
  echo(chalk.green.bold(`Successfully generated .env file for ${stackName}`));
};

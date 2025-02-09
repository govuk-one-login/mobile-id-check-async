import inquirer from "inquirer";
import { echo, chalk, $ } from "zx";

export const askForBaseStackName = async (): Promise<{
  baseStackName: string;
}> => {
  return await inquirer.prompt<{ baseStackName: string }>([
    {
      type: "input",
      name: "baseStackName",
      message: "Please provide a base stack name:",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Your answer seems to be empty, please provide a stack name...";
        }
        return true;
      },
    },
  ]);
};

export const pleaseTryAgainErrorMessage = (): void => {
  echo("");
  echo(chalk.red("Please try again!"));
};

export const successfullyGeneratedBothEnvsMessage = (
  baseStackName: string,
): void => {
  echo(
    chalk.green.bold(
      `Successfully generated .env files for ${baseStackName}-async-backend and ${baseStackName}-test-resources`,
    ),
  );
};

export const successfullyGeneratedEnvMessage = (stackName: string): void => {
  echo(chalk.green.bold(`Successfully generated .env file for ${stackName}`));
};

export const whichStacksToGenerateEnvFor = async (
  baseStackName: string,
): Promise<{ choice: string }> => {
  return await inquirer.prompt<{ choice: string }>([
    {
      type: "list",
      name: "choice",
      message: "Which of your stacks do you want to generate .env files for?",
      choices: [
        "Both",
        `${baseStackName}-async-backend`,
        `${baseStackName}-test-resources`,
      ],
    },
  ]);
};

export const generateEnvs = async (
  baseStackName: string,
  choice: string,
): Promise<void> => {
  if (choice === "Both") {
    try {
      echo("");
      await $({
        stdio: "inherit",
      })`cd ../backend-api && sh generate_env_file.sh ${baseStackName}`;
      await $({
        stdio: "inherit",
      })`cd ../sts-mock && sh generate_env_file.sh ${baseStackName}`;
    } catch {
      pleaseTryAgainErrorMessage();
      process.exit(1);
    }
    echo("");
    successfullyGeneratedBothEnvsMessage(baseStackName);
  }

  if (choice.includes("-async-backend")) {
    try {
      await $({
        stdio: "inherit",
      })`cd ../backend-api && sh generate_env_file.sh ${baseStackName}`;
    } catch {
      pleaseTryAgainErrorMessage();
      process.exit(1);
    }
    echo("");
    successfullyGeneratedEnvMessage(`${baseStackName}-async-backend`);
  }

  if (choice.includes("-test-resources")) {
    try {
      await $({
        stdio: "inherit",
      })`cd ../sts-mock && sh generate_env_file.sh ${baseStackName}`;
    } catch {
      pleaseTryAgainErrorMessage();
      process.exit(1);
    }
    echo("");
    successfullyGeneratedEnvMessage(`${baseStackName}-test-resources`);
  }
};

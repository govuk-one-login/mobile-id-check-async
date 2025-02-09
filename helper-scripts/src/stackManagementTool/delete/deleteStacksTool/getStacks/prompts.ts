import inquirer from "inquirer";
import { chalk, echo } from "zx";

export const selectingStacksForDeletionInfoMessage = (): void => {
  echo(
    chalk.italic.dim("Please note, the following stack dependencies exists:"),
  );
  echo(
    chalk.italic.dim("- The test-resource stack depends on the backend stack"),
  );
  echo(
    chalk.italic.dim(
      "- The backend stack depends on the backend-cf-dist stack",
    ),
  );
  echo("");
};

export const askForBaseStackNames = async (
  baseStackNames: string[],
): Promise<{ baseStackName: string }> => {
  return await inquirer.prompt<{ baseStackName: string }>([
    {
      type: "input",
      name: "baseStackName",
      message: "Please provide a base stack name:",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Your answer seems to be empty, please provide a stack name...";
        }
        if (baseStackNames.includes(input)) {
          return `You've already chosen ${input}, please provide another base stack name...`;
        }
        return true;
      },
    },
  ]);
};

export const askToAddMoreBaseStacks = async (): Promise<{ choice: string }> => {
  return await inquirer.prompt<{
    choice: string;
  }>([
    {
      type: "list",
      name: "choice",
      message: "Do you want to add another base stack name?",
      choices: ["Yes", "No"],
    },
  ]);
};

export const noStackForBaseStackNameInfoMessage = (
  stackType: string,
  stackName: string,
): void => {
  echo(
    chalk.dim(`No ${stackType} stack found for base stack name: ${stackName}`),
  );
};

export const askWhichStacksToDelete = async (
  candidates: string[],
): Promise<{ stacksToDelete: string[] }> => {
  return await inquirer.prompt<{
    stacksToDelete: string[];
  }>([
    {
      type: "checkbox",
      name: "stacksToDelete",
      message: "Confirm which of the following stacks you want to delete",
      choices: candidates,
    },
  ]);
};

export const selectingStacksErrorMessage = (error: unknown): void => {
  echo(chalk.red("Error selecting stacks to delete. Error: ", error));
};

export const noStacksSelectedErrorMessage = (): void => {
  echo(chalk.red("No stacks selected for deletion, please try again"));
  echo("");
};

export const youAreAboutToDeleteMessage = (stacks: string[]): void => {
  echo(chalk.bold("You are about to delete the following stacks:"));
  stacks.forEach((stackName) => echo(`- ${stackName}`));
  echo("");
};

export const areYouHappyToDeleteMessage = async (): Promise<{
  isHappy: boolean;
}> => {
  return await inquirer.prompt<{ isHappy: boolean }>([
    {
      type: "confirm",
      name: "isHappy",
      message: "Are you happy to continue?",
      default: true,
    },
  ]);
};

export const exitingToolWarningMessage = (): void => {
  echo("");
  echo(chalk.yellow("Exiting tool..."));
};

export const continueDimMessage = (): void => {
  echo(chalk.dim("Continuing..."));
};

export const cannotDeleteProtectStackErrorMessage = (
  stackName: string,
): void => {
  echo(chalk.red(`It is not permitted to delete stack: ${stackName}`));
  echo(chalk.red("Please try again without including this stack"));
};

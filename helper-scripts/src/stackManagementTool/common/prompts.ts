import inquirer from "inquirer";
import { echo, chalk } from "zx";

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

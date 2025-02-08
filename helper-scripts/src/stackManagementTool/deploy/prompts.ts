import inquirer from "inquirer";
import { chalk, echo } from "zx";

export const askForBaseStackNames = async (): Promise<{
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

export const runningToolMessage = (): void => {
  echo(chalk.italic("Running stack deployment tool..."));
  echo("");
};

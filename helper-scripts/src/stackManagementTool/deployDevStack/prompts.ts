import inquirer from "inquirer";
import { chalk, echo } from "zx";

export const askForBaseStackNames = async (): Promise<{
  baseStackName: string;
}> => {
  return await inquirer.prompt<{ baseStackName: string }>([
    {
      type: "input",
      name: "baseStackName",
      message: "Provide a base stack name:",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Answer cannot be empty!";
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

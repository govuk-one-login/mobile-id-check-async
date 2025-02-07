import inquirer from "inquirer";
import { $, chalk, echo } from "zx";

export const deployDevStack = async (): Promise<void> => {
  echo(chalk.italic("Running stack deployment tool..."));
  echo("");
  const { baseStackName } = await inquirer.prompt<{ baseStackName: string }>([
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
  echo("");

  await $({ stdio: "inherit" })`sh deploy_backend.sh ${baseStackName}`;
};

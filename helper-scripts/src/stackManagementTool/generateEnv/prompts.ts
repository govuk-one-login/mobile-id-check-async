import inquirer from "inquirer";
import { chalk, echo } from "zx";

export const generateEnvToolInfoMessage = (): void => {
  echo(
    chalk.italic.dim(
      `Please note, you do ${chalk.underline("not")} need to use this tool after deploying a stack, as the deployment tool will do this for you`,
    ),
  );
  echo("");
};

export const askCustomStackOrMainDev = async (): Promise<{
  customStackOrMain: string;
}> => {
  return await inquirer.prompt<{ customStackOrMain: string }>([
    {
      type: "list",
      name: "customStackOrMain",
      message:
        "Do you want to generate a .env files for custom dev stacks or the main dev stack?",
      choices: ["Custom stack(s)", "Main stack(s)"],
    },
  ]);
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

import inquirer from "inquirer";
import { chalk } from "zx";

export const askWhichDeletionTool = async (): Promise<{ choice: string }> => {
  return await inquirer.prompt<{
    choice: string;
  }>([
    {
      type: "list",
      name: "choice",
      message: "Please select which deletion tool you would like to use",
      choices: [
        `Standard ${chalk.dim.italic("(recommended: test-resource stack era)")}`,
        `Legacy ${chalk.dim.italic("(not recommended: sts-mock stack era)")}`,
        "Back",
      ],
    },
  ]);
};

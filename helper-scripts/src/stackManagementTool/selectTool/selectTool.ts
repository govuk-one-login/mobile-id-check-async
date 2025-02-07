import inquirer from "inquirer";
import { chalk, echo } from "zx";
import { whichDeletionTool } from "../deleteDevStacks/utils/whichDeletionTool.js";
import { deployDevStack } from "../deployDevStack/deployDevStack.js";

export const selectTool = async (): Promise<void> => {
  echo("");
  echo(
    chalk.cyanBright.bold.italic(
      "Welcome to ID Check's stack management tool!",
    ),
  );
  echo("");

  const { choice } = await inquirer.prompt<{
    choice: string;
  }>([
    {
      type: "list",
      name: "choice",
      message: "What do you want to do?",
      choices: ["Deploy stacks", "Delete stacks"],
    },
  ]);
  echo("");

  if (choice === "Delete stacks") {
    await whichDeletionTool();
  }

  await deployDevStack();
};

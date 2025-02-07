import inquirer from "inquirer";
import { echo } from "zx";
import { whichDeletionTool } from "../deleteDevStacks/utils/whichDeletionTool.js";
import { deployDevStack } from "../deployDevStack/deployDevStack.js";
import { welcomeMessage } from "../styling/styling.js";

export const selectTool = async (): Promise<void> => {
  welcomeMessage();
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
  } else {
    await deployDevStack();
  }
};

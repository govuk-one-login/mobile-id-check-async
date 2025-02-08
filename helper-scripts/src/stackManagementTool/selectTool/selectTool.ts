import inquirer from "inquirer";
import { echo } from "zx";
import { whichDeletionTool } from "../deleteDevStacks/utils/whichDeletionTool.js";
import { deployDevStack } from "../deployDevStack/deployDevStack.js";
import { welcomeMessage } from "../styling/styling.js";
import { askWhichTool } from "./prompts.js";

export const selectTool = async (): Promise<void> => {
  welcomeMessage();

  const { choice } = await askWhichTool();
  echo("");

  if (choice === "Delete stacks") {
    await whichDeletionTool();
  } else {
    await deployDevStack();
  }
};

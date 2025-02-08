import { echo } from "zx";
import { whichDeletionTool } from "../delete/utils/whichDeletionTool.js";
import { deployDevStack } from "../deploy/deployDevStack.js";
import { askWhichTool, welcomeMessage } from "./prompts.js";

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

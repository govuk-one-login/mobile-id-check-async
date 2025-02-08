import { echo } from "zx";
import { deployDevStack } from "../deploy/deployDevStack.js";
import { askWhichTool, welcomeMessage } from "./prompts.js";
import { whichDeletionTool } from "./selectDeletionTool/selectDeletionTool.js";

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

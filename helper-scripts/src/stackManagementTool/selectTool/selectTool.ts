import { echo } from "zx";
import { whichDeletionTool } from "../deleteDevStacks/utils/whichDeletionTool.js";
import { deployDevStack } from "../deployDevStack/deployDevStack.js";
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

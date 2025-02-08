import { echo } from "zx";
import { deployStackTool } from "../deploy/deployStackTool.js";
import { askWhichTool, welcomeMessage } from "./prompts.js";
import { whichDeletionTool } from "../delete/selectDeletionTool/selectDeletionTool.js";

export const selectTool = async (): Promise<void> => {
  welcomeMessage();

  const { choice } = await askWhichTool();
  echo("");

  if (choice === "Delete stacks") {
    await whichDeletionTool();
  } else {
    await deployStackTool();
  }
};

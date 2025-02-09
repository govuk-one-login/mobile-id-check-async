import { echo } from "zx";
import { deleteStacksToolLegacy } from "../deleteLegacy/deleteStacksToolLegacy.js";
import { askWhichDeletionTool } from "./prompts.js";
import { deleteStacksTool } from "../deleteStacksTool/deleteStacksTool.js";

export const whichDeletionTool = async (): Promise<void> => {
  const { choice } = await askWhichDeletionTool();
  echo("");

  if (choice.includes("Legacy")) {
    await deleteStacksToolLegacy();
  } else {
    await deleteStacksTool();
  }
};

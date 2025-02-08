import { echo } from "zx";
import { deleteStacksTool } from "../../delete/deleteStacksTool.js";
import { deleteStacksToolLegacy } from "../../deleteLegacy/deleteStacksToolLegacy.js";
import { askWhichDeletionTool } from "./prompts.js";

export const whichDeletionTool = async (): Promise<void> => {
  const { choice } = await askWhichDeletionTool();
  echo("");

  if (choice === "Legacy (if your environment still has an sts-mock stack)") {
    await deleteStacksToolLegacy();
  }

  await deleteStacksTool();
};

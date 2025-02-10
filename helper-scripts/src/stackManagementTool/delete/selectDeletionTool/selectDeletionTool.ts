import { echo } from "zx";
import { deleteStacksToolLegacy } from "../deleteLegacy/deleteStacksToolLegacy.js";
import { askWhichDeletionTool } from "./prompts.js";
import { deleteStacksTool } from "../deleteStacksTool/deleteStacksTool.js";
import { goBackToMenu } from "../../common/Back/goBackToMenu.js";

export const whichDeletionTool = async (): Promise<void> => {
  const { choice } = await askWhichDeletionTool();
  echo("");

  if (choice.includes("Back")) {
    await goBackToMenu();
  } else {
    if (choice.includes("Legacy")) {
      await deleteStacksToolLegacy();
    }

    if (choice.includes("Standard")) {
      await deleteStacksTool();
    }
  }
};

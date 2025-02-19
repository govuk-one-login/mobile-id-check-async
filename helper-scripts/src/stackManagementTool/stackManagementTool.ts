import { echo } from "zx";
import { deployStackTool } from "./deploy/deployStackTool.js";
import { whichDeletionTool } from "./delete/selectDeletionTool/selectDeletionTool.js";
import { askWhichTool, quitMessage, toolStoppedMessage } from "./prompts.js";
import { generateEnvTool } from "./generateEnv/generateEnvTool.js";

export const stackManagementTool = async (): Promise<void> => {
  // TODO think of new name, too similar to stack orq tool
  try {
    const { choice } = await askWhichTool();
    echo("");

    if (choice.includes("Delete")) {
      await whichDeletionTool(); // TODO sounds like it's going to check which to use rather than use it, naming either more verbose or split into two steps
    }

    if (choice.includes("Deploy")) {
      await deployStackTool();
    }

    if (choice.includes("Generate")) {
      await generateEnvTool();
    }

    if (choice.includes("Quit")) {
      quitMessage();
      process.exit(0);
    }
  } catch (error: unknown) {
    toolStoppedMessage(error);
  }
};

// TODO make it obvious that we're only going down one path

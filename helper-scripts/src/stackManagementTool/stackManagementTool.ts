import { echo } from "zx";
import { deployStackTool } from "./deploy/deployStackTool.js";
import { whichDeletionTool } from "./delete/selectDeletionTool/selectDeletionTool.js";
import { askWhichTool, welcomeMessage } from "./prompts.js";
import { generateEnvTool } from "./generateEnv/generateEnvTool.js";

export const stackManagementTool = async (): Promise<void> => {
  welcomeMessage();

  const { choice } = await askWhichTool();
  echo("");

  if (choice.includes("Delete")) {
    await whichDeletionTool();
  }

  if (choice.includes("Deploy")) {
    await deployStackTool();
  }

  if (choice.includes("Generate")) {
    await generateEnvTool();
  }
};

import {
  askCustomStackOrMainDev,
  generateEnvToolInfoMessage,
  whichStacksToGenerateEnvFor,
} from "./prompts.js";
import { echo } from "zx";
import { generateEnvs } from "./generateEnvs/generateEnvs.js";
import { getStackName } from "./getStackName/getStackName.js";
import { runningToolMessage } from "../common/prompts.js";
import { goBackToMenu } from "../common/Back/goBackToMenu.js";

export const generateEnvTool = async (): Promise<void> => {
  runningToolMessage("Generate .env");
  generateEnvToolInfoMessage();

  const { customStackOrMain } = await askCustomStackOrMainDev();
  echo("");

  if (customStackOrMain.includes("Back")) {
    // TODO Better name here or split out? Weird having back here
    await goBackToMenu();
  } else {
    const baseStackName = await getStackName(customStackOrMain); // TODO is it base stack or stack name??
    echo("");

    const { choice } = await whichStacksToGenerateEnvFor(baseStackName); // TODO Both or just one or the other?
    await generateEnvs(baseStackName, choice);
  }
};

import {
  askCustomStackOrMainDev,
  generateEnvToolInfoMessage,
  whichStacksToGenerateEnvFor,
} from "./prompts.js";
import { echo } from "zx";
import { generateEnvs } from "./generateEnvs/generateEnvs.js";
import { getStackName } from "./getStackName/getStackName.js";
import { runningToolMessage } from "../common/prompts.js";

export const generateEnvTool = async (): Promise<void> => {
  runningToolMessage("Generate .env");
  generateEnvToolInfoMessage();

  const { customStackOrMain } = await askCustomStackOrMainDev();
  echo("");

  const baseStackName = await getStackName(customStackOrMain);
  echo("");

  const { choice } = await whichStacksToGenerateEnvFor(baseStackName);
  await generateEnvs(baseStackName, choice);
};

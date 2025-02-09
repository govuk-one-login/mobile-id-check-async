import { echo } from "zx";
import {
  askForBaseStackName,
  generateEnvs,
  whichStacksToGenerateEnvFor,
} from "../../common/prompts.js";

export const generateEnvForCustomStacks = async (): Promise<void> => {
  echo("");
  const { baseStackName } = await askForBaseStackName();

  echo("");
  const { choice } = await whichStacksToGenerateEnvFor(baseStackName);

  await generateEnvs(baseStackName, choice);
};

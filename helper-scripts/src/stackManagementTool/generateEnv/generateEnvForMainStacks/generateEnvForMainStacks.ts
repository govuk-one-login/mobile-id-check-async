import { echo } from "zx";
import {
  generateEnvs,
  whichStacksToGenerateEnvFor,
} from "../../common/prompts.js";

export const generateEnvForMainStacks = async (): Promise<void> => {
  echo("");
  const baseStackName = "mob";

  echo("");
  const { choice } = await whichStacksToGenerateEnvFor(baseStackName);

  await generateEnvs(baseStackName, choice);
};

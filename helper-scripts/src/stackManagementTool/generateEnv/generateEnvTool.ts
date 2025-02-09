import { generateEnvForMainStacks } from "./generateEnvForMainStacks/generateEnvForMainStacks.js";
import { generateEnvForCustomStacks } from "./customStacks/generateEnvForCustomStacks.js";
import { askCustomStackOrMainDev } from "./prompts.js";

export const generateEnvTool = async (): Promise<void> => {
  const { customStackOrMain } = await askCustomStackOrMainDev();
  if (customStackOrMain === "Main stack(s) in dev") {
    await generateEnvForMainStacks();
  } else {
    await generateEnvForCustomStacks();
  }
};

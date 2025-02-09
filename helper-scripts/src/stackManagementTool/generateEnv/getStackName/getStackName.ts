import { askForBaseStackName } from "../../common/prompts.js";

export const getStackName = async (
  customStackOrMain: string,
): Promise<string> => {
  let baseStackName;
  if (customStackOrMain === "Main stack(s) in dev") {
    baseStackName = "mob";
  } else {
    const answer = await askForBaseStackName();
    baseStackName = answer.baseStackName;
  }
  return baseStackName;
};

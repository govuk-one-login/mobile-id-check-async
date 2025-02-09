import { $, echo } from "zx";
import { askForBaseStackName, runningToolMessage } from "../common/prompts.js";
import { errorDeployingStacksMessage } from "./prompts.js";

export const deployStackTool = async (): Promise<void> => {
  runningToolMessage("stack deployment");

  const { baseStackName } = await askForBaseStackName();
  echo("");

  try {
    await $({
      stdio: "inherit",
      signal: new AbortController().signal,
    })`sh deploy_backend.sh ${baseStackName}`;
  } catch (error) {
    errorDeployingStacksMessage(error);
  }
};

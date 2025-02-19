import { $, echo } from "zx";
import { askForBaseStackName, runningToolMessage } from "../common/prompts.js";
import { errorDeployingStacksMessage } from "./prompts.js";

export const deployStackTool = async (): Promise<void> => {
  runningToolMessage("stack deployment");

  const { baseStackName } = await askForBaseStackName();
  echo("");

  try {
    await $({
      // TODO could be a helper func here as not a great interface
      stdio: "inherit",
      signal: new AbortController().signal,
    })`sh deploy_backend.sh ${baseStackName}`;
  } catch (error) {
    errorDeployingStacksMessage(error);
  }
};

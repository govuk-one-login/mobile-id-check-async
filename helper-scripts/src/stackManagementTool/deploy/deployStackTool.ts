import { $, echo } from "zx";
import { askForBaseStackNames, runningToolMessage } from "./prompts.js";

export const deployStackTool = async (): Promise<void> => {
  runningToolMessage();

  const { baseStackName } = await askForBaseStackNames();
  echo("");

  await $({ stdio: "inherit" })`sh deploy_backend.sh ${baseStackName}`;
};

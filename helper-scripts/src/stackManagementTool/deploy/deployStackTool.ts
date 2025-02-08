import { $, echo } from "zx";
import { runningToolMessage } from "./prompts.js";
import { askForBaseStackName } from "../common/prompts.js";

export const deployStackTool = async (): Promise<void> => {
  runningToolMessage();

  const { baseStackName } = await askForBaseStackName();
  echo("");

  await $({ stdio: "inherit" })`sh deploy_backend.sh ${baseStackName}`;
};

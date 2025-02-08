import inquirer from "inquirer";
import { $, chalk, echo } from "zx";
import { askForBaseStackNames, runningToolMessage } from "./prompts";

export const deployDevStack = async (): Promise<void> => {
  runningToolMessage();

  const { baseStackName } = await askForBaseStackNames();
  echo("");

  await $({ stdio: "inherit" })`sh deploy_backend.sh ${baseStackName}`;
};

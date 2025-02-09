import { $, echo } from "zx";
import { askForBaseStackName, runningToolMessage } from "../common/prompts.js";

export const deployStackTool = async (): Promise<void> => {
  runningToolMessage("stack deployment");

  const { baseStackName } = await askForBaseStackName();
  echo("");

  await $({ stdio: "inherit" })`sh deploy_backend.sh ${baseStackName}`;
};

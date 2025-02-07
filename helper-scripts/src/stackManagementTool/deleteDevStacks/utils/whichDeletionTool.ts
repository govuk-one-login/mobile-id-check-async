import inquirer from "inquirer";
import { echo } from "zx";
import { deleteDevStacksLegacy } from "../../deleteDevStackLegacy/deleteDevStacksLegacy.js";
import { deleteDevStacks } from "../deleteDevStacks.js";

export const whichDeletionTool = async (): Promise<void> => {
  const { choice } = await inquirer.prompt<{
    choice: string;
  }>([
    {
      type: "list",
      name: "choice",
      message: "Please select which deletion tool you would like to use:",
      choices: [
        "Standard (recommended)",
        "Legacy (if your environment still is using an sts-mock stack)",
      ],
    },
  ]);
  echo("");

  if (
    choice === "Legacy (if your environment still is using an sts-mock stack)"
  ) {
    await deleteDevStacksLegacy();
  }

  await deleteDevStacks();
};

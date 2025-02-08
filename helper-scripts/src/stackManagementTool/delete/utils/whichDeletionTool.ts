import inquirer from "inquirer";
import { chalk, echo } from "zx";
import { deleteDevStacksLegacy } from "../../deleteLegacy/deleteDevStacksLegacy.js";
import { deleteDevStacks } from "../deleteDevStacks.js";

export const whichDeletionTool = async (): Promise<void> => {
  const { choice } = await inquirer.prompt<{
    choice: string;
  }>([
    {
      type: "list",
      name: "choice",
      message: "Please select which deletion tool you would like to use",
      choices: [
        `Standard ${chalk.dim.italic("(recommended: test-resource stack era)")}`,
        `Legacy ${chalk.dim.italic("(not recommended: sts-mock stack era)")}`,
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

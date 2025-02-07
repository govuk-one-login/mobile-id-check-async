import inquirer from "inquirer";
import { deleteDevStacks } from "./deleteDevStacks.js";
import { deleteDevStacksLegacy } from "./deleteDevStacksLegacy.js";
import { echo } from "zx";

const { whichTool } = await inquirer.prompt<{
  whichTool: string;
}>([
  {
    type: "list",
    name: "whichTool",
    message: "Please select which deletion tool you would like to use:",
    choices: [
      "Standard (recommended)",
      "Legacy (if your environment still is using an sts-mock stack)",
    ],
  },
]);
echo("");

if (
  whichTool === "Legacy (if your environment still is using an sts-mock stack)"
) {
  await deleteDevStacksLegacy();
}

await deleteDevStacks();

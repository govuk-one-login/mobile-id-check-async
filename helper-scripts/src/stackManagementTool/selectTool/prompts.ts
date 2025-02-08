import inquirer from "inquirer";
import { chalk, echo } from "zx";
import { multiColouredText } from "../styling/styling.js";
import { deleteStacksToolLegacy } from "../deleteLegacy/deleteStacksToolLegacy.js";
import { deleteStacksTool } from "../delete/deleteStacksTool.js";

export const welcomeMessage = (): void => {
  const part1 = chalk.italic(multiColouredText("Welcome"));
  const part2 = chalk.cyanBright.bold.italic(" to the ");
  const part3 = chalk.cyanBright.bold.italic.underline("unofficial");
  const part4 = chalk.cyanBright.bold.italic(
    " ID Check stack management tool...",
  );
  echo(part1 + part2 + part3 + part4);
  echo("");
};

export const askWhichTool = async (): Promise<{ choice: string }> => {
  return await inquirer.prompt<{ choice: string }>([
    {
      type: "list",
      name: "choice",
      message: "What do you want to do?",
      choices: ["Deploy stacks", "Delete stacks"],
    },
  ]);
};

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
    await deleteStacksToolLegacy();
  }

  await deleteStacksTool();
};

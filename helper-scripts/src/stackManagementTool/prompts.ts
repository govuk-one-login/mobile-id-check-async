import inquirer from "inquirer";
import { chalk, echo } from "zx";
import { multiColouredText } from "./styling/styling.js";

export const welcomeMessage = (): void => {
  const part1 = chalk.italic(multiColouredText("Welcome"));
  const part2 = chalk.cyanBright.bold.italic(" to the ");
  const part3 = chalk.cyanBright.bold.italic.underline("unofficial");
  const part4 = chalk.cyanBright.bold.italic(
    " ID Check Async stack management tool...",
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
      choices: ["Deploy stacks", "Delete stacks", "Generate .env", "Quit"],
    },
  ]);
};

export const quitMessage = (): void => {
  echo(chalk.dim.italic("Quitting tool..."));
};

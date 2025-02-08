import { chalk, echo } from "zx";
import { getStacks } from "./getStacks/getStacks.js";
import { deleteStacks } from "./deleteStacks/deleteStacks.js";

export const deleteStacksTool = async (): Promise<void> => {
  try {
    echo(chalk.italic("Running stack deletion tool..."));
    echo("");
    const stacks = await getStacks();
    await deleteStacks(stacks);
  } catch (error: unknown) {
    echo(chalk.red("There was an error. Error:", error));
  }
};

export interface PrioritisedStacks {
  stacksToDeleteOrder01: string[];
  stacksToDeleteOrder02: string[];
  stacksToDeleteOrder03: string[];
}

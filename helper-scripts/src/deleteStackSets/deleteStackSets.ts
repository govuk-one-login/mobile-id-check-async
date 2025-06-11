import { getStacks } from "./getStacks/getStacks.js";
import { deleteStacks } from "./deleteStacks/deleteStacks.js";
import { chalk, echo } from "zx";

export const deleteStackSets = async (): Promise<void> => {
  try {
    const stacks = await getStacks();
    await deleteStacks(stacks);
  } catch (error: unknown) {
    echo(chalk.red("There was an error. Error:", error));
  }
};

await deleteStackSets();

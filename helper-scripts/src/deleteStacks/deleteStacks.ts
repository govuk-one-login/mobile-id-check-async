import { getStacks } from "./getStacks/getStacks.js";
import { deleteCloudFormationStacks } from "./deleteCloudFormationStacks/deleteCloudFormationStacks.js";
import { chalk, echo } from "zx";

export const deleteStacks = async (): Promise<void> => {
  try {
    const stacks = await getStacks();
    await deleteCloudFormationStacks(stacks);
  } catch (error: unknown) {
    echo(chalk.red("There was an error. Error:", error));
  }
};

await deleteStacks();

import { getStacks } from "./getStacks/getStacks.js";
import { deleteStacks } from "./deleteStacks/deleteStacks.js";
import { deleteStacksToolErrorMessage } from "./prompts.js";
import { runningToolMessage } from "../../common/prompts.js";

export const deleteStacksTool = async (): Promise<void> => {
  // TODO Add another option somewhere to delete custom stack names not following base stack name convention
  try {
    runningToolMessage("stack deletion");
    const stacks = await getStacks();
    await deleteStacks(stacks);
  } catch (error: unknown) {
    deleteStacksToolErrorMessage(error);
  }
};

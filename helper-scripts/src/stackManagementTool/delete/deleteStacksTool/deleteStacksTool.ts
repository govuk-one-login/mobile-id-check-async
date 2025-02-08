import { getStacks } from "./getStacks/getStacks.js";
import { deleteStacks } from "./deleteStacks/deleteStacks.js";
import {
  deleteStacksToolErrorMessage,
  runningStackDeletionToolMessage,
} from "./prompts.js";

export const deleteStacksTool = async (): Promise<void> => {
  try {
    runningStackDeletionToolMessage();
    const stacks = await getStacks();
    await deleteStacks(stacks);
  } catch (error: unknown) {
    deleteStacksToolErrorMessage(error);
  }
};
export interface PrioritisedStacks {
  stacksToDeleteOrder01: string[];
  stacksToDeleteOrder02: string[];
  stacksToDeleteOrder03: string[];
}

import inquirer from "inquirer";
import { deleteStackGroupApplication } from "./deleteStackGroup.js";
import { deleteSpecificStacksApplication } from "./deleteSpecificStacks.js";
import { Results } from "../../common/results.js";

const deleteStackApplicationTypes = ["SPECIFIC_STACKS", "ALL_STACKS"] as const;
export type DeleteStackApplicationMethod =
  (typeof deleteStackApplicationTypes)[number];

export enum StackMethodPrompts {
  ALL_STACKS = "Delete an entire application",
  SPECIFIC_STACKS = "Delete stack(s) by name",
}

export const promptToDeleteStackMethodRecord: Record<
  StackMethodPrompts,
  { stackMethod: DeleteStackApplicationMethod }
> = {
  "Delete an entire application": {
    stackMethod: "ALL_STACKS",
  },
  "Delete stack(s) by name": {
    stackMethod: "SPECIFIC_STACKS",
  },
};

export interface Application {
  getNames: (deployedStackNames: string[]) => Promise<string[]>;
  deleteStacks: (stackNames: string[]) => Promise<Results>;
}

class DeleteStackFactory {
  static getDeleteStackApplication = (
    getDeleteStackApplicationFromStackMethod: DeleteStackApplicationMethod,
  ): Application => {
    switch (getDeleteStackApplicationFromStackMethod) {
      case "ALL_STACKS": {
        return deleteStackGroupApplication;
      }

      case "SPECIFIC_STACKS": {
        return deleteSpecificStacksApplication;
      }
    }
  };
}

export const getDeleteStackApplicationFromStackMethod = (
  deleteStackMethodPrompt: StackMethodPrompts,
): Application => {
  const deleteStackMethodRecord =
    promptToDeleteStackMethodRecord[deleteStackMethodPrompt];
  return DeleteStackFactory.getDeleteStackApplication(
    deleteStackMethodRecord.stackMethod,
  );
};

export const getDeleteStackMethodFromPrompt =
  async (): Promise<StackMethodPrompts> => {
    const response = await inquirer.prompt<{ stackName: StackMethodPrompts }>([
      {
        type: "list",
        choices: Object.keys(promptToDeleteStackMethodRecord),
        message: "Select an option",
        name: "stackName",
      },
    ]);
    return response.stackName;
  };

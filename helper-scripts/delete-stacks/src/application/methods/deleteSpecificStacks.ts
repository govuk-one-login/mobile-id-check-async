import inquirer from "inquirer";
import { Application } from "./stackMethod.js";
import { deleteStack } from "../../common/aws/cloudformation.js";
import {
  buildStackFailureResultFromError,
  Results,
} from "../../common/results.js";

const getStackNamesFromInput = async (
  deployedStackNames: string[],
): Promise<string[]> => {
  const validateStackNameExists = (stackName: string): true | string => {
    if (deployedStackNames.includes(stackName)) return true;
    return "Stack name does not exist. Please try again";
  };
  const stackNames = [];
  let continuePrompt = true;
  while (continuePrompt) {
    const result = await inquirer.prompt<{
      continue: string;
      stackName: string;
    }>([
      {
        type: "input",
        message: "Enter a stack name for deletion:",
        name: "stackName",
        required: true,
        validate: validateStackNameExists,
      },
      {
        type: "list",
        message: "More stacks to delete?",
        name: "continue",
        choices: ["Yes", "No"],
      },
    ]);
    stackNames.push(result.stackName);
    if (result.continue === "No") {
      continuePrompt = false;
    }
  }
  return stackNames;
};

export const deleteSpecificStacksApplication: Application = {
  getNames: async (deployedStackNames: string[]) => {
    const stackNames = await getStackNamesFromInput(deployedStackNames);
    return stackNames;
  },

  deleteStacks: async (stackNames: string[]): Promise<Results> => {
    const results: Results = [];
    for (const stackName of stackNames) {
      try {
        await deleteStack(stackName);
        results.push({ stackName, status: "SUCCESS" });
      } catch (error) {
        console.log(error);
        const failureResult = buildStackFailureResultFromError(
          stackName,
          error,
        );
        results.push(failureResult);
      }
    }
    return results;
  },
};

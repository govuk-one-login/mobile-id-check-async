import inquirer from "inquirer";

export const askForBaseStackNames = async (
  baseStackNames: string[],
): Promise<{ baseStackName: string }> => {
  return await inquirer.prompt<{ baseStackName: string }>([
    {
      type: "input",
      name: "baseStackName",
      message: "Please provide a base stack name:",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Your answer seems to be empty, please provide a stack name...";
        }
        if (baseStackNames.includes(input)) {
          return `You've already chosen ${input}, please provide another base stack name...`;
        }
        return true;
      },
    },
  ]);
};

export const askToAddMoreBaseStacks = async (): Promise<{ choice: string }> => {
  return await inquirer.prompt<{
    choice: string;
  }>([
    {
      type: "list",
      name: "choice",
      message: "Do you want to add another base stack name?",
      choices: ["Yes", "No"],
    },
  ]);
};

export const askWhichStacksToDelete = async (
  candidates: string[],
): Promise<{ stacksToDelete: string[] }> => {
  return await inquirer.prompt<{
    stacksToDelete: string[];
  }>([
    {
      type: "checkbox",
      name: "stacksToDelete",
      message: "Confirm which of the following stacks you want to delete",
      choices: candidates,
    },
  ]);
};

export const areYouHappyToDelete = async (): Promise<{
  isHappy: boolean;
}> => {
  return await inquirer.prompt<{ isHappy: boolean }>([
    {
      type: "confirm",
      name: "isHappy",
      message: "Are you happy to continue?",
      default: true,
    },
  ]);
};

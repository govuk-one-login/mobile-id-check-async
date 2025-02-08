import inquirer from "inquirer";

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

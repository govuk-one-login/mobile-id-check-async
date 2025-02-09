import inquirer from "inquirer";

export const askCustomStackOrMainDev = async (): Promise<{
  customStackOrMain: string;
}> => {
  return await inquirer.prompt<{ customStackOrMain: string }>([
    {
      type: "list",
      name: "customStackOrMain",
      message:
        "Do you want to generate a .env for custom dev stacks or the main dev stack?",
      choices: ["Custom stack(s)", "Main stack(s) in dev"],
    },
  ]);
};

import inquirer from "inquirer";

export const askForSecret = async (): Promise<{
  secret: string;
}> => {
  return await inquirer.prompt<{ secret: string }>([
    {
      type: "input",
      name: "secret",
      message: "Please provide a secret",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Your answer seems to be empty, please provide a secret...";
        }
        return true;
      },
    },
  ]);
};

export const askForSalt = async (): Promise<{
  salt: string;
}> => {
  return await inquirer.prompt<{ salt: string }>([
    {
      type: "input",
      name: "salt",
      message: "Please provide a salt",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Your answer seems to be empty, please provide a salt...";
        }
        return true;
      },
    },
  ]);
};

import inquirer from "inquirer";
import { chalk, echo } from "zx";

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

export const generatingHashedSecretMessage = (): void => {
  echo("");
  echo(chalk.italic("Generating hashed secret..."));
};

export const echoSuccessfullyHashedSecret = (hashedSecret: string): void => {
  echo("");
  echo(chalk.green(hashedSecret));
};

export const unexpectedErrorMessage = (error: unknown): void => {
  echo("");
  echo("This script has stopped unexpectedly. Error:");
  echo("");
  echo(chalk.red.italic(error));
};

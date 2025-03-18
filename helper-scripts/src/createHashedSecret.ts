import inquirer from "inquirer";
import { echo } from "zx";
import { createHash } from "crypto";

const askForSecret = async (): Promise<{
  secret: string;
}> => {
  return await inquirer.prompt<{ secret: string }>([
    {
      type: "input",
      name: "secret",
      message: "Provide secret",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Your answer seems to be empty, please provide a secret..";
        }
        return true;
      },
    },
  ]);
};

const askForSalt = async (): Promise<{
  salt: string;
}> => {
  return await inquirer.prompt<{ salt: string }>([
    {
      type: "input",
      name: "salt",
      message: "Provide salt",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Your answer seems to be empty, please provide a salt..";
        }
        return true;
      },
    },
  ]);
};

const generateHashedSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

const { secret } = await askForSecret()
const { salt } = await askForSalt()
echo(await generateHashedSecret(secret, salt))


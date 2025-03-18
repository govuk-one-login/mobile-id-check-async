import { chalk, echo } from "zx";
import { createHash } from "crypto";
import { askForSalt, askForSecret, generatingHashedSecretMessage, unexpectedErrorMessage } from "./prompts.js";

const generateHashedSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

try {
  const { secret } = await askForSecret()
  const { salt } = await askForSalt()

  generatingHashedSecretMessage()
  const hashedSecret = await generateHashedSecret(secret, salt)

  echo(chalk.green(hashedSecret))
} catch (error: unknown) {
  unexpectedErrorMessage(error)
}

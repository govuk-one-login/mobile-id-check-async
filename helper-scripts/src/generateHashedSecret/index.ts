import { chalk, echo } from "zx";
import { askForSalt, askForSecret, generatingHashedSecretMessage, unexpectedErrorMessage } from "./prompts.js";
import { generateHashedSecret } from "./generateHashedSecret.js";

try {
  const { secret } = await askForSecret()
  const { salt } = await askForSalt()

  generatingHashedSecretMessage()
  const hashedSecret = await generateHashedSecret(secret, salt)

  echo(chalk.green(hashedSecret))
} catch (error: unknown) {
  unexpectedErrorMessage(error)
}

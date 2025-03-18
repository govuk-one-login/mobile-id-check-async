import { chalk, echo } from "zx";
import { askForSalt, askForSecret, generatingHashedSecretMessage, unexpectedErrorMessage } from "./prompts.js";
import { hashSecret } from "./hashSecret.js";

try {
  const { secret } = await askForSecret()
  const { salt } = await askForSalt()

  generatingHashedSecretMessage()
  const hashedSecret = await hashSecret(secret, salt)

  echo(chalk.green(hashedSecret))
} catch (error: unknown) {
  unexpectedErrorMessage(error)
}

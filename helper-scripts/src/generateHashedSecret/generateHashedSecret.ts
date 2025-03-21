import { askForSalt, askForSecret } from "./prompts.js";
import { hashSecret } from "./hashSecret.js";
import { chalk, echo } from "zx";

try {
  const { secret } = await askForSecret();
  const { salt } = await askForSalt();
  const hashedSecret = await hashSecret({ secret, salt });

  writeSuccessfullyHashedSecretMessage(hashedSecret);
} catch (error: unknown) {
  writeUnexpectedErrorMessage(error);
}

function writeSuccessfullyHashedSecretMessage(hashedSecret: string): void {
  echo("");
  echo(chalk.green(hashedSecret));
}

function writeUnexpectedErrorMessage(error: unknown): void {
  echo("");
  echo("This script has stopped unexpectedly. Error:");
  echo("");
  echo(chalk.red.italic(error));
}

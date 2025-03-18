import { chalk, echo } from "zx";
import { createHash } from "crypto";
import { askForSalt, askForSecret, generatingHashedSecretMessage } from "./prompts.js";

const generateHashedSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

const { secret } = await askForSecret()
const { salt } = await askForSalt()

generatingHashedSecretMessage()

echo(chalk.green(await generateHashedSecret(secret, salt)))

import { createHash } from "crypto";
import { chalk, echo } from "zx";

interface HashSecret {
  secret: string;
  salt: string;
}

export const hashSecret = (options: HashSecret): string => {
  generatingHashedSecretMessage();
  const { secret, salt } = options;
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

const generatingHashedSecretMessage = (): void => {
  echo("");
  echo(chalk.italic("Generating hashed secret..."));
};

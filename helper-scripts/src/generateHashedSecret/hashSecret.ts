import { createHash } from "crypto";
import { generatingHashedSecretMessage } from "./prompts.js";

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

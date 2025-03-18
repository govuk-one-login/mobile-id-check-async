import { createHash } from "crypto";
import { generatingHashedSecretMessage } from "./prompts.js";

export const hashSecret = (secret: string, salt: string): string => {
  generatingHashedSecretMessage();
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

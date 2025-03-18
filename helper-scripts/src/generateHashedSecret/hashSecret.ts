import { createHash } from "crypto";

export const hashSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};
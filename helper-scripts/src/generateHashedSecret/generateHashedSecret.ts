import {
  askForSalt,
  askForSecret,
  confirmSuccessfullyHashedSecret,
  unexpectedErrorMessage,
} from "./prompts.js";
import { hashSecret } from "./hashSecret.js";

try {
  const { secret } = await askForSecret();
  const { salt } = await askForSalt();
  const hashedSecret = await hashSecret(secret, salt);

  confirmSuccessfullyHashedSecret(hashedSecret);
} catch (error: unknown) {
  unexpectedErrorMessage(error);
}

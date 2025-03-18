import {
  askForSalt,
  askForSecret,
  echoSuccessfullyHashedSecret,
  unexpectedErrorMessage,
} from "./prompts.js";
import { hashSecret } from "./hashSecret.js";

try {
  const { secret } = await askForSecret();
  const { salt } = await askForSalt();
  const hashedSecret = await hashSecret({ secret, salt });

  echoSuccessfullyHashedSecret(hashedSecret);
} catch (error: unknown) {
  unexpectedErrorMessage(error);
}

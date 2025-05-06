import { JwtPayload } from "../../../../types/jwt";
import { Result } from "../../../../utils/result";

export type CreateKmsSignedJwt = (
  kid: string,
  message: JwtPayload,
) => Promise<Result<string, void>>;

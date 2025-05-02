import { JwtPayload } from "../../../../types/jwt";
import { Result } from "../../../../utils/result";

export type CreateSignedJwt = (
  kid: string,
  message: JwtPayload,
) => Promise<Result<string, void>>;

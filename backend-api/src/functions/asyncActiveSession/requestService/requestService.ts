import { getBearerTokenFromHeader } from "../../services/utils/requestService";
import { Result } from "../../utils/result";

export class RequestService implements IRequestService {
  getAuthorizationHeader = (authorizationHeader: string | undefined) => {
    return getBearerTokenFromHeader(authorizationHeader);
  };
}

export interface IRequestService {
  getAuthorizationHeader: (
    authorizationHeader: string | undefined,
  ) => Result<string>;
}

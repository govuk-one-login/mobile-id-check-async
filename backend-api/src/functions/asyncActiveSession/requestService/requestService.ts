import { getBearerToken } from "../../services/utils/getBearerToken";
import { Result } from "../../utils/result";

export class RequestService implements IRequestService {
  getAuthorizationHeader = (authorizationHeader: string | undefined) => {
    return getBearerToken(authorizationHeader);
  };
}

export interface IRequestService {
  getAuthorizationHeader: (
    authorizationHeader: string | undefined,
  ) => Result<string>;
}

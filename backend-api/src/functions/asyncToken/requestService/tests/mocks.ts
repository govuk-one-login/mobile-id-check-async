import { Result, successResult } from "../../../utils/result";
import {
  IDecodedAuthorizationHeader,
  IRequestService,
} from "../requestService";

export class MockRequestServiceSuccessResult implements IRequestService {
  getClientCredentials = (): Result<IDecodedAuthorizationHeader> => {
    return successResult({
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
    });
  };
  validateBody = (): Result<null> => {
    return successResult(null);
  };
}

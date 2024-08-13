import { errorResult, Result, successResult } from "../../../utils/result";
import { IDecodedAuthorizationHeader, IRequestService } from "../requestService";

export class RequestServiceSuccessResult implements IRequestService {
  getClientCredentials = (): Result<IDecodedAuthorizationHeader> => {
    return successResult(
      {
        clientId: "mockClientId",
        clientSecret: "mockClientSecret"
      }
    )
  }
  validateBody = (): Result<null> => {
    return successResult(null)

  }

}


export class RequestServiceInvalidAuthHeaderResult implements IRequestService {
  getClientCredentials = (): Result<IDecodedAuthorizationHeader> => {
    return errorResult({errorCategory: "CLIENT_ERROR", errorMessage: "Client credentials not valid"})
  }
  validateBody = (): Result<null> => {
    return successResult(null)

  }
}
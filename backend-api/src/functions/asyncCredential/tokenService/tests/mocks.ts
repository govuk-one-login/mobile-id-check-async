import { errorResult, Result, successResult } from "../../../utils/result";
import {
  IDecodedToken,
  IDecodeToken,
  IVerifyTokenSignature,
} from "../tokenService";

const getDecodedTokenSuccessResult = {
  encodedJwt:
    "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
  jwtPayload: {
    aud: "mockIssuer",
    client_id: "mockClientId",
    exp: 1721901143000,
    iss: "mockIssuer",
    scope: "dcmaw.session.async_create",
  },
};

export class MockTokenServiceGetDecodedTokenErrorResult
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): Result<IDecodedToken> {
    return errorResult({
      errorMessage: "Mock decoding token error",
      errorCategory: "SERVER_ERROR",
    });
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(successResult(null));
  }
}

export class MockTokenServiceUnexpectedErrorResult
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): Result<IDecodedToken> {
    return successResult(getDecodedTokenSuccessResult);
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Unexpected error",
        errorCategory: "SERVER_ERROR",
      }),
    );
  }
}

export class MockTokenServiceInvalidSignatureErrorResult
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): Result<IDecodedToken> {
    return successResult(getDecodedTokenSuccessResult);
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Failed to verify token signature",
        errorCategory: "CLIENT_ERROR",
      }),
    );
  }
}

export class MockTokenServiceSuccess
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): Result<IDecodedToken> {
    return successResult(getDecodedTokenSuccessResult);
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(successResult(null));
  }
}

// IPV Core pact mocks
export class MockTokenServiceSuccessIPV
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): Result<IDecodedToken> {
    return successResult({
      encodedJwt:
        "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
      jwtPayload: {
        aud: "mockIssuer",
        client_id: "ipv-core",
        exp: 1721901143000,
        iss: "mockIssuer",
        scope: "dcmaw.session.async_create",
      },
    });
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(successResult(null));
  }
}

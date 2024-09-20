import { errorResult, Result } from "../../utils/result"


export class TokenService implements ITokenService {
  getSubFromToken = () => {
    return errorResult({
      errorMessage: "Unexpected error retrieving STS public key",
      errorCategory: "SERVER_ERROR",
    })
  }
}

interface ITokenService {
  getSubFromToken: () => Result<string>
}

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import 'dotenv/config';
import { validOrThrow } from "../config";
import { ClientCredentialsService, IClientCredentials, IClientCredentialsService } from "./clientCredentialsService/clientCredentialsService";
import { IDecodedAuthorizationHeader, IProcessRequest, RequestService } from "./requestService/requestService";
import { IGetClientCredentials, SsmService } from "./ssmService/ssmService";
import { IMintToken, TokenService } from "./tokenService/tokenService";

export async function lambdaHandlerConstructor (
  dependencies: IAsyncTokenRequestDependencies,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // Environment variables
  let kidArn
  try {
    kidArn = validOrThrow(dependencies.env, 'SIGNING_KEY_IDS')
  } catch (error) {
    return serverErrorResponse
  }

  // Ensure that request contains expected params
  const requestService = dependencies.getRequestService()
  const processRequest = requestService.processRequest(event)

  if (processRequest.isLog) {
    if (processRequest.value === 'Invalid grant_type') {
      return badRequestResponseInvalidGrant
    }

    return badRequestResponseInvalidAuthorizationHeader
  }

  const suppliedCredentials = processRequest.value as IDecodedAuthorizationHeader

  // Fetching stored client credentials
  const ssmService = dependencies.getSsmService()
  const ssmServiceResponse = await ssmService.getClientCredentials()
  if (ssmServiceResponse.isLog) {
    return serverErrorResponse
  }

  const storedCredentialsArray = ssmServiceResponse.value as IClientCredentials[]

  // Incoming credentials match stored credentials
  const clientCredentialsService = dependencies.getClientCredentialsService()
  const storedCredentials = clientCredentialsService.getClientCredentialsById(storedCredentialsArray, suppliedCredentials.clientId)
  if (!storedCredentials) {
    return badRequestResponseInvalidCredentials
  }

  const isValidClientCredentials = clientCredentialsService.validate(storedCredentials, suppliedCredentials)
  if (!isValidClientCredentials) {
    return badRequestResponseInvalidCredentials
  }

  const jwtPayload = {
    "aud": storedCredentials.issuer,
    "iss": "https://www.review-b.account.gov.uk",
    "exp": Math.floor(Date.now() / 1000) + 3600,
    "scope": "dcmaw.session.async_create",
    "client_id": storedCredentials.client_id
  }

  let accessToken
  const tokenService = dependencies.getTokenService(kidArn)
  try {
    accessToken = await tokenService.mintToken(jwtPayload)
  } catch (error) {
    return serverErrorResponse
  }

  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Pragma": "no-cache"
    },
    statusCode: 200,
    body: JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600
    })
  }
}

const badRequestResponseInvalidGrant: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: 'invalid_grant',
    error_description: 'Invalid grant type or grant type not specified'
  })
}

const badRequestResponseInvalidAuthorizationHeader: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: 'invalid_authorization_header',
    error_description: 'Invalid authorization header'
  })
}

const badRequestResponseInvalidCredentials: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 400,
  body: JSON.stringify({
    error: 'invalid_client',
    error_description: 'Supplied client credentials not recognised'
  })
}

const serverErrorResponse: APIGatewayProxyResult = {
  headers: { "Content-Type": "application/json" },
  statusCode: 500,
  body: JSON.stringify({
    error: 'server_error',
    error_description: 'Server Error'
  })
}

export interface IAsyncTokenRequestDependencies {
  env: NodeJS.ProcessEnv,
  getRequestService: () => IProcessRequest,
  getSsmService: () => IGetClientCredentials,
  getClientCredentialsService: () => IClientCredentialsService,
  getTokenService: (signingKey: string) => IMintToken
}

const dependencies: IAsyncTokenRequestDependencies = {
  env: process.env,
  getRequestService: () => new RequestService(),
  getSsmService: () => new SsmService(),
  getClientCredentialsService: () => new ClientCredentialsService(),
  getTokenService: (signingKey: string) => new TokenService(signingKey)
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies)

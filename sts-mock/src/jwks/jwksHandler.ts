import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  dependencies,
} from "./handlerDependencies";
import {GetPublicKeyCommand, KMSClient} from '@aws-sdk/client-kms'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import crypto from 'node:crypto'

export async function lambdaHandlerConstructor(
  dependencies: any,
  context: Context,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {

  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const keyId = process.env.SIGNING_KEY_ID!;

  const kmsClient = new KMSClient({
    region: process.env.REGION,
    requestHandler: new NodeHttpHandler({
      requestTimeout: 29000,
      connectionTimeout: 5000
    }),
    maxAttempts: 3
  })

  let kmsKey;
  try {
    kmsKey = await kmsClient.send(new GetPublicKeyCommand({ KeyId: keyId }))
  } catch (error) {
    logger.warn('Failed to fetch key from KMS', { error })
  }

  const publicKey = crypto
      .createPublicKey({
        key: kmsKey!.PublicKey as Buffer,
        type: 'spki',
        format: 'der'
      })
      .export({ format: 'jwk' })


  //
  // const configResult = new ConfigService().getConfig(dependencies.env);
  // if (configResult.isError) {
  //   logger.log("ENVIRONMENT_VARIABLE_MISSING", {
  //     errorMessage: configResult.value.errorMessage,
  //   });
  //   return serverErrorResponse;
  // }
  //
  // const config = configResult.value;
  //
  // // Ensure that request contains expected params
  // const eventBodyResult = requestService.validateBody(event.body);
  // if (eventBodyResult.isError) {
  //   logger.log("INVALID_REQUEST", {
  //     errorMessage: eventBodyResult.value.errorMessage,
  //   });
  //   return badRequestResponseInvalidGrant;
  // }
  //
  // const eventHeadersResult = requestService.getClientCredentials(event.headers);
  // if (eventHeadersResult.isError) {
  //   logger.log("INVALID_REQUEST", {
  //     errorMessage: eventHeadersResult.value.errorMessage,
  //   });
  //   return badRequestResponseInvalidAuthorizationHeader;
  // }
  //
  // const clientCredentials = eventHeadersResult.value;
  //
  // // Retrieving issuer and validating client secrets
  // const clientRegistryService = dependencies.clientRegistryService(
  //   config.CLIENT_REGISTRY_PARAMETER_NAME,
  // );
  // const getRegisteredIssuerByClientSecretsResult =
  //   await clientRegistryService.getRegisteredIssuerUsingClientSecrets(
  //     clientCredentials,
  //   );
  // if (getRegisteredIssuerByClientSecretsResult.isError) {
  //   if (
  //     getRegisteredIssuerByClientSecretsResult.value.errorCategory ===
  //     "SERVER_ERROR"
  //   ) {
  //     logger.log("INTERNAL_SERVER_ERROR", {
  //       errorMessage:
  //         getRegisteredIssuerByClientSecretsResult.value.errorMessage,
  //     });
  //     return serverErrorResponse;
  //   }
  //   logger.log("INVALID_REQUEST", {
  //     errorMessage: getRegisteredIssuerByClientSecretsResult.value.errorMessage,
  //   });
  //   return badRequestResponseInvalidCredentials;
  // }
  //
  // const registeredIssuer = getRegisteredIssuerByClientSecretsResult.value;
  //
  // const jwtPayload = {
  //   aud: registeredIssuer,
  //   iss: config.ISSUER,
  //   exp: Math.floor(Date.now() / 1000) + 3600,
  //   scope: "dcmaw.session.async_create",
  //   // The clientId can be trusted as the credential service validates the incoming clientId against the client registry
  //   client_id: clientCredentials.clientId,
  // };
  //
  // const tokenService = dependencies.tokenService(config.SIGNING_KEY_ID);
  //
  // const mintTokenResult = await tokenService.mintToken(jwtPayload);
  // if (mintTokenResult.isError) {
  //   logger.log("INTERNAL_SERVER_ERROR", {
  //     errorMessage: mintTokenResult.value.errorMessage,
  //   });
  //   return serverErrorResponse;
  // }
  // const accessToken = mintTokenResult.value;
  //
  // const eventWriter = dependencies.eventService(config.SQS_QUEUE);
  // const writeEventResult = await eventWriter.writeCredentialTokenIssuedEvent({
  //   componentId: config.ISSUER,
  //   getNowInMilliseconds: Date.now,
  //   eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
  // });
  // if (writeEventResult.isError) {
  //   logger.log("ERROR_WRITING_AUDIT_EVENT", {
  //     errorMessage: writeEventResult.value.errorMessage,
  //   });
  //   return serverErrorResponse;
  // }

  logger.log("COMPLETED");

  return {
    headers: {
      "Content-Type": "application/json",
    },
    statusCode: 200,
    body: JSON.stringify({
      publicKey
    }),
  };
}
// const badRequestResponseInvalidGrant: APIGatewayProxyResult = {
//   headers: { "Content-Type": "application/json" },
//   statusCode: 400,
//   body: JSON.stringify({
//     error: "invalid_grant",
//     error_description: "Invalid grant type or grant type not specified",
//   }),
// };
//
// const badRequestResponseInvalidAuthorizationHeader: APIGatewayProxyResult = {
//   headers: { "Content-Type": "application/json" },
//   statusCode: 400,
//   body: JSON.stringify({
//     error: "invalid_authorization_header",
//     error_description: "Invalid authorization header",
//   }),
// };
//
// const badRequestResponseInvalidCredentials: APIGatewayProxyResult = {
//   headers: { "Content-Type": "application/json" },
//   statusCode: 400,
//   body: JSON.stringify({
//     error: "invalid_client",
//     error_description: "Supplied client credentials not recognised",
//   }),
// };
//
// const serverErrorResponse: APIGatewayProxyResult = {
//   headers: { "Content-Type": "application/json" },
//   statusCode: 500,
//   body: JSON.stringify({
//     error: "server_error",
//     error_description: "Server Error",
//   }),
// };

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

import { base64url } from "jose";
import { JwtHeader, JwtPayload } from "../../../../types/jwt";
import { emptyFailure, Result, successResult } from "../../../../utils/result";
import { SignCommand, SignCommandOutput } from "@aws-sdk/client-kms";
import { kmsClient } from "../kmsClient";
import format from "ecdsa-sig-formatter";
import { LogMessage } from "../../../../common/logging/LogMessage";
import { logger } from "../../../../common/logging/logger";
import { CreateSignedJwt } from "./types";

export const createSignedJwt: CreateSignedJwt = async (kid, message) => {
  const encodedJwtComponents = buildEncodedJwtComponents(kid, message);
  const unsignedJwt = `${encodedJwtComponents.header}.${encodedJwtComponents.payload}`;

  const getSignatureResult = await getSignature(kid, unsignedJwt);
  if (getSignatureResult.isError) {
    return getSignatureResult;
  }
  const encodedSignature = encodeSignature(getSignatureResult.value);

  logger.debug(LogMessage.CREATE_SIGNED_JWT_SUCCESS);
  return successResult(
    `${encodedJwtComponents.header}.${encodedJwtComponents.payload}.${encodedSignature}`,
  );
};

const buildEncodedJwtComponents = (
  kid: string,
  message: JwtPayload,
): {
  header: string;
  payload: string;
} => {
  const jwtHeader: JwtHeader = { alg: "ES256", kid, typ: "JWT" };
  return {
    header: base64url.encode(JSON.stringify(jwtHeader)),
    payload: base64url.encode(JSON.stringify(message)),
  };
};

const getSignature = async (
  kid: string,
  unsignedJwt: string,
): Promise<Result<Uint8Array<ArrayBufferLike>, void>> => {
  let result: SignCommandOutput;
  try {
    logger.debug(LogMessage.CREATE_SIGNED_JWT_ATTEMPT, {
      data: {
        kid,
      },
    });

    result = await kmsClient.send(
      new SignCommand({
        Message: Buffer.from(unsignedJwt),
        KeyId: kid,
        SigningAlgorithm: "ECDSA_SHA_256",
        MessageType: "RAW",
      }),
    );
  } catch (error: unknown) {
    logger.error(LogMessage.CREATE_SIGNED_JWT_FAILURE, {
      error,
    });
    return emptyFailure();
  }

  if (!result.Signature) {
    logger.error(LogMessage.CREATE_SIGNED_JWT_FAILURE, {
      error: "No signature in response from KMS",
    });
    return emptyFailure();
  }

  return successResult(result.Signature);
};

const encodeSignature = (signature: Uint8Array<ArrayBufferLike>): string => {
  return format.derToJose(Buffer.from(signature), "ES256");
};

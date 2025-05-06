import { base64url } from "jose";
import { JwtHeader, JwtPayload } from "../../../../types/jwt";
import { emptyFailure, Result, successResult } from "../../../../utils/result";
import { SignCommand, SignCommandOutput } from "@aws-sdk/client-kms";
import { kmsClient } from "../kmsClient";
import format from "ecdsa-sig-formatter";
import { LogMessage } from "../../../../common/logging/LogMessage";
import { logger } from "../../../../common/logging/logger";
import { CreateKmsSignedJwt } from "./types";

export const createKmsSignedJwt: CreateKmsSignedJwt = async (kid, message) => {
  const encodedUnsignedJwt = buildEncodedUnsignedJwt(kid, message);

  const getSignatureResult = await getSignature({ kid, encodedUnsignedJwt });
  if (getSignatureResult.isError) {
    return getSignatureResult;
  }
  const encodedSignature = encodeSignature(getSignatureResult.value);

  logger.debug(LogMessage.CREATE_SIGNED_JWT_SUCCESS);
  return successResult(`${encodedUnsignedJwt}.${encodedSignature}`);
};

const buildEncodedUnsignedJwt = (kid: string, message: JwtPayload): string => {
  const jwtHeader: JwtHeader = { alg: "ES256", kid, typ: "JWT" };
  const encodedHeader = base64url.encode(JSON.stringify(jwtHeader));
  const encodedPayload = base64url.encode(JSON.stringify(message));
  return `${encodedHeader}.${encodedPayload}`;
};

const getSignature = async (params: {
  kid: string;
  encodedUnsignedJwt: string;
}): Promise<Result<Uint8Array<ArrayBufferLike>, void>> => {
  const { kid, encodedUnsignedJwt } = params;

  let result: SignCommandOutput;
  try {
    logger.debug(LogMessage.CREATE_SIGNED_JWT_ATTEMPT, {
      data: {
        kid,
      },
    });

    result = await kmsClient.send(
      new SignCommand({
        Message: Buffer.from(encodedUnsignedJwt),
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

import { base64url } from "jose";
import { JwtHeader, JwtPayload } from "../../../types/jwt";
import { emptyFailure, Result, successResult } from "../../../utils/result";
import { SignCommand, SignCommandOutput } from "@aws-sdk/client-kms";
import { kmsClient } from "./kmsClient";
import format from "ecdsa-sig-formatter";
import { LogMessage } from "../../../common/logging/LogMessage";
import { logger } from "../../../common/logging/logger";

export const createSignedJwt = async (
  message: JwtPayload,
  kidArn: string,
): Promise<Result<string, void>> => {
  const tokenComponents = buildTokenComponents(message, kidArn);
  const unsignedToken = `${tokenComponents.header}.${tokenComponents.payload}`;

  let result: SignCommandOutput;
  try {
    logger.debug(LogMessage.CREATE_SIGNED_JWT_ATTEMPT, {
      data: {
        kidArn,
      },
    });
    const command = new SignCommand({
      Message: Buffer.from(unsignedToken),
      KeyId: kidArn,
      SigningAlgorithm: "ECDSA_SHA_256",
      MessageType: "RAW",
    });

    result = await kmsClient.send(command);
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

  const signatureBuffer = Buffer.from(result.Signature);
  tokenComponents.signature = format.derToJose(signatureBuffer, "ES256");

  logger.debug(LogMessage.CREATE_SIGNED_JWT_SUCCESS);
  return successResult(
    `${tokenComponents.header}.${tokenComponents.payload}.${tokenComponents.signature}`,
  );
};

const buildTokenComponents = (message: JwtPayload, kidArn: string) => {
  const jwtHeader: JwtHeader = { alg: "ES256", typ: "JWT" };
  const kid = kidArn.split("/").pop();
  if (kid != null) {
    jwtHeader.kid = kid;
  }

  return {
    header: base64url.encode(JSON.stringify(jwtHeader)),
    payload: base64url.encode(JSON.stringify(message)),
    signature: "",
  };
};

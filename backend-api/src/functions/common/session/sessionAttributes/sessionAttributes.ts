import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { NativeAttributeValue, unmarshall } from "@aws-sdk/util-dynamodb";
import { errorResult, Result, successResult } from "../../../utils/result";
import {
  BaseSessionAttributes,
  BiometricSessionFinishedAttributes,
  BiometricTokenIssuedSessionAttributes,
  AuthSessionAbortedAttributes,
  SessionState,
} from "../session";
import { ValidateSessionErrorInvalidAttributeTypeData } from "../SessionRegistry";

export const getBaseSessionAttributes = (
  item: Record<string, AttributeValue>,
): Result<
  BaseSessionAttributes,
  ValidateSessionErrorInvalidAttributeTypeData
> => {
  const sessionAttributes = unmarshall(item);
  if (!isBaseSessionAttributes(sessionAttributes))
    return errorResult({ sessionAttributes });

  return successResult(sessionAttributes);
};

const isBaseSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is BaseSessionAttributes => {
  if (!isCommonSessionAttributes(item)) return false;
  return true;
};

const isCommonSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): boolean => {
  if (typeof item.clientId !== "string") return false;
  if (typeof item.clientState !== "string") return false;
  if (typeof item.createdAt !== "number") return false;
  if (typeof item.govukSigninJourneyId !== "string") return false;
  if (typeof item.issuer !== "string") return false;
  if (typeof item.sessionId !== "string") return false;
  if (typeof item.sessionState !== "string") return false;
  if (typeof item.subjectIdentifier !== "string") return false;
  if (typeof item.timeToLive !== "number") return false;
  if ("redirectUri" in item && typeof item.redirectUri !== "string") {
    return false;
  }
  return true;
};

export const getBiometricTokenIssuedSessionAttributes = (
  item: Record<string, AttributeValue>,
): Result<
  BiometricTokenIssuedSessionAttributes,
  ValidateSessionErrorInvalidAttributeTypeData
> => {
  const sessionAttributes = unmarshall(item);
  if (!isBiometricTokenIssuedSessionAttributes(sessionAttributes))
    return errorResult({ sessionAttributes });

  return successResult(sessionAttributes);
};

export const getTxmaEventBiometricTokenIssuedSessionAttributes = (
  item: Record<string, AttributeValue>,
): Result<
  BiometricTokenIssuedSessionAttributes,
  ValidateSessionErrorInvalidAttributeTypeData
> => {
  const sessionAttributes: Record<string, unknown> = unmarshall(item);
  if (!isBiometricTokenIssuedSessionAttributes(sessionAttributes)) {
    return errorResult({
      sessionAttributes,
    });
  }

  return successResult(sessionAttributes);
};

const isBiometricTokenIssuedSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is BiometricTokenIssuedSessionAttributes => {
  if (!isCommonSessionAttributes(item)) return false;
  if (typeof item.documentType !== "string") return false;
  if (typeof item.opaqueId !== "string") return false;
  return true;
};

export const getBiometricSessionFinishedSessionAttributes = (
  item: Record<string, AttributeValue>,
): Result<
  BiometricSessionFinishedAttributes,
  ValidateSessionErrorInvalidAttributeTypeData
> => {
  const sessionAttributes = unmarshall(item);
  if (!isBiometricSessionFinishedSessionAttributes(sessionAttributes))
    return errorResult({ sessionAttributes });

  return successResult(sessionAttributes);
};

const isBiometricSessionFinishedSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is BiometricSessionFinishedAttributes => {
  if (!isCommonSessionAttributes(item)) return false;
  if (typeof item.documentType !== "string") return false;
  if (typeof item.opaqueId !== "string") return false;
  if (typeof item.biometricSessionId !== "string") return false;
  return true;
};

export const getAuthSessionAbortedAttributes = (
  item: Record<string, AttributeValue>,
): Result<
  AuthSessionAbortedAttributes,
  ValidateSessionErrorInvalidAttributeTypeData
> => {
  const sessionAttributes = unmarshall(item);
  if (!isAuthSessionAbortedAttributes(sessionAttributes)) {
    return errorResult({ sessionAttributes });
  }
  return successResult(sessionAttributes);
};

const isAuthSessionAbortedAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is AuthSessionAbortedAttributes => {
  if (!isCommonSessionAttributes(item)) {
    return false;
  }
  return item.sessionState === SessionState.AUTH_SESSION_ABORTED;
};

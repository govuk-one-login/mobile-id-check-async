import {AttributeValue} from '@aws-sdk/client-dynamodb'
import {emptyFailure, errorResult, Result, successResult, SuccessWithValue} from "../utils/result";
import {
  AuthSessionCreatedSession,
  BiometricSessionFinishedSession,
  BiometricTokenIssuedSession,
  ResultSentSession,
  Session,
  SessionState
} from "../common/session/Session";

export interface InvalidFieldsError {
  invalidFields: SessionField[]
}

export type IConvertDynamoDBItemToSession = (
  item: DynamoDBItem,
) => Result<Session, InvalidFieldsError>

export function getDynamoDBItemToSessionConvertor(
  state: SessionState,
): IConvertDynamoDBItemToSession {
  switch (state) {
    case SessionState.AUTH_SESSION_CREATED:
      return convertToAuthSessionCreatedSession
    case SessionState.BIOMETRIC_TOKEN_ISSUED:
      return convertToBiometricTokenIssuedSession
    case SessionState.BIOMETRIC_SESSION_FINISHED:
      return convertToBiometricSessionFinishedSession
    case SessionState.RESULT_SENT:
      return convertToResultSentSession
  }
}

const commonFields: (keyof Session)[] = [
  'sessionId',
  'createdAt',
  'timeToLive',
  'clientId',
  'govukSigninJourneyId',
  'issuer',
  'clientState',
  'subjectIdentifier',
  'redirectUri'
]

export const convertToAuthSessionCreatedSession: IConvertDynamoDBItemToSession = (
  item: DynamoDBItem,
): Result<AuthSessionCreatedSession, InvalidFieldsError> => {
  const authSessionCreatedFields: (keyof AuthSessionCreatedSession)[] = commonFields
  const result = getSessionFieldsAndValues(item, authSessionCreatedFields)
  if (result.isError) {
    return result
  }
  return successResult(result.value as AuthSessionCreatedSession)
}

export const convertToBiometricTokenIssuedSession: IConvertDynamoDBItemToSession = (
  item: DynamoDBItem,
): Result<BiometricTokenIssuedSession, InvalidFieldsError> => {
  const biometricTokenIssuedFields: (keyof BiometricTokenIssuedSession)[] = [
    ...commonFields,
    'documentType',
    'accessToken',
    'opaqueId'
  ]
  const result = getSessionFieldsAndValues(item, biometricTokenIssuedFields)
  if (result.isError) {
    return result
  }
  return successResult(result.value as BiometricTokenIssuedSession)
}

export const convertToBiometricSessionFinishedSession: IConvertDynamoDBItemToSession =
  (
    item: DynamoDBItem,
  ): Result<BiometricSessionFinishedSession, InvalidFieldsError> => {
    const biometricSessionFinishedFields: (keyof BiometricSessionFinishedSession)[] = [
      ...commonFields,
      'documentType',
      'accessToken',
      'opaqueId',
      'biometricSessionId'
    ]
    const result = getSessionFieldsAndValues(item, biometricSessionFinishedFields)
    if (result.isError) {
      return result
    }
    return successResult(result.value as BiometricSessionFinishedSession)
  }

export const convertToResultSentSession: IConvertDynamoDBItemToSession =
  (
    item: DynamoDBItem,
  ): Result<ResultSentSession, InvalidFieldsError> => {
    const resultSentFields: (keyof ResultSentSession)[] = [
      ...commonFields,
      'documentType',
      'accessToken',
      'opaqueId',
      'biometricSessionId'
    ]
    const result = getSessionFieldsAndValues(item, resultSentFields)
    if (result.isError) {
      return result
    }
    return successResult(result.value as ResultSentSession)
  }


// Helpers


function getSessionFieldsAndValues(
  item: DynamoDBItem,
  fields: SessionField[],
): Result<
  Partial<Record<SessionField, SessionFieldValue>>,
  InvalidFieldsError
> {
  const extractorsByField = {
    sessionId: extractValidSessionId,
    createdAt: extractValidCreatedAt,
    timeToLive: extractValidTimeToLive,
    sessionState: extractValidSessionState,
    clientId: extractValidClientId,
    govukSigninJourneyId: extractValidGovukSigninJourneyId,
    issuer: extractValidIssuer,
    clientState: extractValidClientState,
    subjectIdentifier: extractValidSubjectIdentifier,
    redirectUri: extractValidRedirectUri,
    documentType: extractValidDocumentType,
    accessToken: extractValidAccessToken,
    opaqueId: extractValidOpaqueId,
    biometricSessionId: extractValidBiometricSessionId
  } as const

  const invalidFields: SessionField[] = []
  const sessionFieldsAndValues: Partial<
    Record<SessionField, SessionFieldValue>
  > = {}

  fields.forEach(field => {
    const extractFieldResult = extractorsByField[field](item)
    if (extractFieldResult.isError) {
      invalidFields.push(field)
    } else {
      sessionFieldsAndValues[field] = extractFieldResult.value
    }
  })

  if (invalidFields.length > 0) {
    return errorResult({ invalidFields })
  }

  return successResult(sessionFieldsAndValues)
}

function extractValidSessionId(item: DynamoDBItem): Result<string, void> {
  const candidate = item.sessionId?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidCreatedAt(item: DynamoDBItem): Result<string, void> {
  const candidate = item.createdAt?.N
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidClientId(item: DynamoDBItem): Result<string, void> {
  const candidate = item.clientId?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidGovukSigninJourneyId(item: DynamoDBItem): Result<string, void> {
  const candidate = item.govukSigninJourneyId?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidIssuer(item: DynamoDBItem): Result<string, void> {
  const candidate = item.issuer?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidClientState(item: DynamoDBItem): Result<string, void> {
  const candidate = item.clientState?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidSubjectIdentifier(item: DynamoDBItem): Result<string, void> {
  const candidate = item.subjectIdentifier?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidRedirectUri(item: DynamoDBItem): SuccessWithValue<string | undefined> {
  return successResult(item.redirectUri?.S)
}

function extractValidDocumentType(item: DynamoDBItem): Result<string, void> {
  const candidate = item.documentType?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidAccessToken(item: DynamoDBItem): Result<string, void> {
  const candidate = item.accessToken?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidOpaqueId(item: DynamoDBItem): Result<string, void> {
  const candidate = item.opaqueId?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidBiometricSessionId(item: DynamoDBItem): Result<string, void> {
  const candidate = item.biometricSessionId?.S
  return candidate ? successResult(candidate) : emptyFailure()
}

function extractValidSessionState(
  item: DynamoDBItem,
): Result<SessionState, void> {
  const candidate = item.sessionState?.S as SessionState
  if (candidate && Object.values(SessionState).includes(candidate)) {
    return successResult(candidate)
  }
  return emptyFailure()
}

function extractValidTimeToLive(item: DynamoDBItem): Result<number, void> {
  const candidate = item.timeToLive?.N
  return candidate ? successResult(Number(candidate)) : emptyFailure()
}

// Types

type DynamoDBItem = Record<string, AttributeValue>

type SessionField =
  | keyof AuthSessionCreatedSession
  | keyof BiometricTokenIssuedSession
  | keyof BiometricSessionFinishedSession
  | keyof ResultSentSession

type SessionFieldValue =
  | AuthSessionCreatedSession[keyof AuthSessionCreatedSession]
  | BiometricTokenIssuedSession[keyof BiometricTokenIssuedSession]
  | BiometricSessionFinishedSession[keyof BiometricSessionFinishedSession]
  | ResultSentSession[keyof ResultSentSession]

import {SessionState} from "./Session";
import {DynamoDbAdapter} from "../../adapters/dynamoDbAdapter";
import {randomUUID} from "crypto";
import "dotenv/config";
import {BiometricSessionFinished} from "./updateOperations/BiometricSessionFinished";
import {BiometricTokenIssued} from "./updateOperations/BiometricTokenIssued";

describe('Sessions', () => {

  // Log into AWS and run this to demonstrate the functionality of the new get/update methods.
  it('Demonstrate functionality of new session get/update methods', async () => {
    const adapter = new DynamoDbAdapter('paste-your-sessions-table-name-here')
    const sessionId = randomUUID()

    await adapter.createSession({
      client_id: "mockClientId",
      govuk_signin_journey_id: "mockJourneyId",
      issuer: "mockIssuer",
      sessionDurationInSeconds: 0,
      state: "mockState",
      sub: "mockSub"
    }, sessionId)

    const sessionCreatedSessionResult = await adapter.getSessionWithState(sessionId, SessionState.AUTH_SESSION_CREATED)
    if (!sessionCreatedSessionResult.isError) {
      const session = sessionCreatedSessionResult.value
      console.log('(1) ', session)
      // console.log(session.opaqueId) - won't compile
    }

    const notFoundSessionResult = await adapter.getSessionWithState(sessionId, SessionState.RESULT_SENT)
    if (notFoundSessionResult.isError) {
      console.log('(2) ', notFoundSessionResult)
    }

    const invalidUpdateResult = await adapter.updateSession(sessionId, new BiometricSessionFinished('mockBiometricSessionId'))
    console.log('(3) ', invalidUpdateResult) // fails conditional check - invalid state

    const validUpdateResult = await adapter.updateSession(sessionId, new BiometricTokenIssued('mockDocumentType', 'mockAccessToken', 'mockOpaqueId'))
    console.log('(4) ', validUpdateResult) // successful update

    const biometricTokenIssuedSessionResult = await adapter.getSessionWithState(sessionId, SessionState.BIOMETRIC_TOKEN_ISSUED)
    if (!biometricTokenIssuedSessionResult.isError) {
      const session = biometricTokenIssuedSessionResult.value
      console.log('(5) ', session)
      console.log('(6) ', session.opaqueId) // compiles now as property is valid for this session state
    }

  })
})



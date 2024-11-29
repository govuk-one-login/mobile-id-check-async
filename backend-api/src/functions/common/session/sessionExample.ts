import {SessionState} from "./Session";
import {DynamoDbAdapter} from "../../adapters/dynamoDbAdapter";


const adapter = new DynamoDbAdapter('tableName')
const session1Result = await adapter.getSessionWithState('id', SessionState.BIOMETRIC_TOKEN_ISSUED)
if (session1Result.isError) {
  throw new Error('error')
}
const session1 = session1Result.value
console.log(session1.clientId)
console.log(session1.documentType)

const session2Result = await adapter.getSessionWithState('id', SessionState.AUTH_SESSION_CREATED)
if (session2Result.isError) {
  throw new Error('error')
}
const session2 = session2Result.value
console.log(session2.clientId)
console.log(session2.documentType)
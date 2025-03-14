import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";

export interface GetSessionOperation {
  getDynamoDbKeyExpression(sessionId: string): Record<string, AttributeValue>;
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void>;
}

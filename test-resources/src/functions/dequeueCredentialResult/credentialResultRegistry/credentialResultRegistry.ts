import { PutItemOperation } from "../../common/dynamoDBAdapter/putItemOperation";
import { Result } from "../../common/utils/result";

export interface ICredentialResultRegistry {
  putItem(putItemOperation: PutItemOperation): Promise<Result<void, void>>;
}

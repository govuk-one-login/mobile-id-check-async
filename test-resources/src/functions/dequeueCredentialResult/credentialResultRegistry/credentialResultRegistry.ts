import { PutItemOperation } from "../../common/dynamoDBAdapter/putItemOperation";
import { Result } from "../../common/utils/result";

export interface ICredentialResultRegistry {
  putItem(putItemOperation: PutItemOperation): Promise<Result<void, void>>;
}

// export class CredentialResultRegistry implements ICredentialResultRegistry {
//   putItem(
//     item: ICredentialResult,
//     putItemOperation: PutItemOperation,
//   ): Promise<Result<void, void>> {
//     throw new Error("Method not implemented.");
//   }
// }

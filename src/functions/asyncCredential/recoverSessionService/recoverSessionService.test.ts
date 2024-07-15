import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { recoverSessionService } from "./recoverSessionService";
import { mockClient } from "aws-sdk-client-mock";
describe("Recover Session Service", () => {
  describe("Given there is an unexpected error when calling Dynamo DB", () => {
    it("Returns error response", async () => {
      const service = new recoverSessionService(
        "mockTableName",
        "mockIndexName",
      );
      const dbMock = mockClient(DynamoDBClient);
      dbMock.on(QueryCommand).rejects("Mock DB Error");

      const result = await service.getAuthSessionBySub(
        "mockSub",
        "mockState",
        1000,
      );

      expect(result.isError).toBe(true);
      expect(result.value).toEqual(
        "Unexpected error when querying session table whilst checking for recoverable session",
      );
    });
  });
});

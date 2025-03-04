import { APIGatewayProxyEvent } from "aws-lambda";
import { buildRequest } from "../../../testUtils/mockRequest";
import { AuditData, getAuditData } from "./getAuditData";

describe("Get audit data", () => {
  let event: APIGatewayProxyEvent;
  let result: AuditData;

  describe("Given txma audit encoded header is not present", () => {
    beforeEach(() => {
      event = buildRequest({
        headers: {
          "Txma-Audit-Encoded": undefined,
        },
      });
      result = getAuditData(event);
    });

    it("Returns ipAddress", () => {
      expect(result).toEqual({
        ipAddress: "1.1.1.1",
      });
    });
  });

  describe("Given txma audit encoded header is present", () => {
    beforeEach(() => {
      event = buildRequest({
        headers: {
          "Txma-Audit-Encoded": "mockTxmaAuditEncodedHeader",
        },
      });
      result = getAuditData(event);
    });

    it("Returns ipAddress and txmaAuditEncoded header", () => {
      expect(result).toEqual({
        ipAddress: "1.1.1.1",
        txmaAuditEncoded: "mockTxmaAuditEncodedHeader",
      });
    });
  });
});

import { APIGatewayProxyEvent } from "aws-lambda";
import { getIpAddress } from "../getIpAddress/getIpAddress";
import { getHeader } from "../getHeader/getHeader";

export const getAuditData = (event: APIGatewayProxyEvent): AuditData => {
  return {
    ipAddress: getIpAddress(event),
    txmaAuditEncoded: getHeader(event.headers, "Txma-Audit-Encoded"),
  };
};

export interface AuditData {
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

import { APIGatewayProxyEvent } from "aws-lambda";
import { getIpAddress } from "../getIpAddress/getIpAddress";
import { getHeader } from "../getHeader/getHeader";

export const getAuditData = (event: APIGatewayProxyEvent): AuditData => {
  const ipAddress = getIpAddress(event);
  const txmaAuditEncoded = getHeader(event.headers, "Txma-Audit-Encoded");

  return {
    ipAddress,
    txmaAuditEncoded,
  };
};

export interface AuditData {
  ipAddress: string;
  txmaAuditEncoded: string | undefined;
}

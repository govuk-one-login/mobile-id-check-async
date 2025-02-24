import { APIGatewayProxyEvent } from "aws-lambda";
import { logger } from "../../logging/logger";
import { LogMessage } from "../../logging/LogMessage";
import { getHeader } from "../getHeader/getHeader";

// The below function gets the IP address from the event and parses this.
// The IP address may be retrieved from the cloudfront-viewer-address header in which case it truncates the port by converting it to a URL and
// getting the hostname, and getting rid of the square brackets using the regex (only needed for IPv6 addresses)
// If cloudfront-viewer-address is not present it retrieves the IP from $.requestContext.identity.sourceIp
// The definition of how Cloudfront represents the header is here: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-cloudfront-headers.html#cloudfront-headers-viewer-location
export const getIpAddress = (event: APIGatewayProxyEvent): string => {
  const userIpFromCloudFront = getHeader(
    event.headers,
    "cloudfront-viewer-address",
  );

  if (userIpFromCloudFront !== undefined) {
    try {
      return parseIp(userIpFromCloudFront);
    } catch {
      logger.warn(LogMessage.IP_ADDRESS_FROM_CLOUDFRONT_IS_MALFORMED);
    }
  }

  return event.requestContext.identity.sourceIp;
};

function parseIp(ip: string) {
  const url = new URL(`http://${ip}`);
  return url.hostname.replace(/[[\]]/gi, ""); // removes square brackets from IP
}

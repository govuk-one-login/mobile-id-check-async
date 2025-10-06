import { Context } from "aws-lambda";
import { logger } from "./logger";
import { buildUserAgent } from "./buildUserAgent";

export const setupLogger = (
  context: Context,
  userAgentHeader?: string,
) => {
  logger.resetKeys();
  logger.addContext(context);
  logger.appendKeys({
    functionVersion: context.functionVersion,
    userAgent: buildUserAgent(userAgentHeader),
  });
};

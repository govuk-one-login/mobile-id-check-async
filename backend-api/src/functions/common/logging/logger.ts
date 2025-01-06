import { Logger } from "@aws-lambda-powertools/logger";
import { Context } from "aws-lambda";

export const logger = new Logger();

export function setupLoggerForNewInvocation(logger: Logger, context: Context) {
  logger.resetKeys();
  logger.addContext(context);
}

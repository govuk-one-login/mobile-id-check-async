import { Context } from "aws-lambda";
import { logger } from "./logger";

export const setupLogger = (context: Context) => {
  logger.resetKeys();
  logger.addContext(context);
  logger.appendKeys({ functionVersion: context.functionVersion });
};

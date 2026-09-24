import { Context } from "aws-lambda";
import { logger } from "./logger.js";

export const setupLogger = (context: Context) => {
  logger.resetKeys();
  logger.addContext(context);
  logger.appendKeys({ functionVersion: context.functionVersion });
};

import { Context } from "aws-lambda";
import { logger } from "./logger";

export const setupLogger = (context: Context, userAgent: string) => {
  logger.resetKeys();
  logger.addContext(context);
  logger.appendKeys({ functionVersion: context.functionVersion });
  if ((userAgent || "").length == 0) {
    return;
  }
  logger.appendKeys({ userAgent: userAgentKey(userAgent) });
};

export const userAgentKey = (userAgent: string) : Object  => {
  const anyPartHasPrefix = (userAgent : string, prefix : string) : boolean => {
    const parts : string[] = userAgent.split(" ");
    return parts.some(function(part) { return part.startsWith(prefix); });
  }

  const deviceType : string =
      (anyPartHasPrefix(userAgent, "Android/") || anyPartHasPrefix(userAgent, "Dalvik/"))
          ? "Android"
          : (anyPartHasPrefix(userAgent, "iOS/") || anyPartHasPrefix(userAgent, "Darwin/"))
              ? "iPhone"
              : "unknown";

  return {
    userAgentHeader: userAgent,
    deviceType: deviceType,
  }
}

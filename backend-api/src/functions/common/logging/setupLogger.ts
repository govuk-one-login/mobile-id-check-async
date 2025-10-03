import { Context } from "aws-lambda";
import { logger } from "./logger";

export const setupLogger = (
  context: Context,
  userAgentHeader: string | undefined,
) => {
  logger.resetKeys();
  logger.addContext(context);
  logger.appendKeys({
    functionVersion: context.functionVersion,
    userAgent: buildUserAgent(userAgentHeader),
  });
};

export const buildUserAgent = (
  userAgentHeader: string | undefined,
): object | undefined => {
  if (!userAgentHeader) {
    return { userAgentHeader: "", deviceType: "unknown" };
  }

  const anyPartHasPrefix = (parts: string[], prefix: string): boolean => {
    return parts.some(function (part) {
      return part.startsWith(prefix);
    });
  };

  const userAgentParts = userAgentHeader.split(" ");

  const isAndroid =
    anyPartHasPrefix(userAgentParts, "Android/") ||
    anyPartHasPrefix(userAgentParts, "Dalvik/");
  const isIphone =
    anyPartHasPrefix(userAgentParts, "iOS/") ||
    anyPartHasPrefix(userAgentParts, "Darwin/");

  let deviceType = "unknown";
  if (isAndroid) {
    deviceType = "Android";
  }
  if (isIphone) {
    deviceType = "iPhone";
  }
  return {
    userAgentHeader,
    deviceType,
  };
};

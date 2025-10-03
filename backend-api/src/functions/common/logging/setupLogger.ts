import { Context } from "aws-lambda";
import { logger } from "./logger";

export const setupLogger = (
  context: Context,
  userAgent: string | undefined,
) => {
  logger.resetKeys();
  logger.addContext(context);
  logger.appendKeys({
    functionVersion: context.functionVersion,
    userAgent: buildUserAgent(userAgent),
  });
};

export const buildUserAgent = (
  userAgent: string | undefined,
): object | undefined => {
  if (userAgent === undefined || userAgent === "") {
    return { userAgentHeader: "", deviceType: "unknown" };
  }

  const anyPartHasPrefix = (parts: string[], prefix: string): boolean => {
    return parts.some(function (part) {
      return part.startsWith(prefix);
    });
  };

  const userAgentParts: string[] = userAgent.split(" ");

  const isAndroid =
    anyPartHasPrefix(userAgentParts, "Android/") ||
    anyPartHasPrefix(userAgentParts, "Dalvik/");
  const isIphone =
    anyPartHasPrefix(userAgentParts, "iOS/") ||
    anyPartHasPrefix(userAgentParts, "Darwin/");

  const deviceTypes: string[] = ["unknown", "Android", "iPhone", "lol"];
  return {
    userAgentHeader: userAgent,
    deviceType: deviceTypes[(isAndroid ? 1 : 0) + (isIphone ? 2 : 0)],
  };
};

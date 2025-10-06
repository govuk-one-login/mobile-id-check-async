export const buildUserAgent = (userAgentHeader?: string): object => {
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

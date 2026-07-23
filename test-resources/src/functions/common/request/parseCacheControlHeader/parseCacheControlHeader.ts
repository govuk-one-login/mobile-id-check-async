export const parseCacheControlHeader = (
  cacheControl: string | undefined,
): { maxAge: number } => {
  if (cacheControl === undefined)
    return {
      maxAge: 0,
    };

  return {
    maxAge: getMaxAge(cacheControl),
  };
};

function getMaxAge(cacheControl: string): number {
  const directives = cacheControl
    .split(",")
    .map((directive) => directive.trim());
  const maxAgeDirectives = directives.filter((directive) =>
    directive.toLowerCase().startsWith("max-age="),
  );
  if (maxAgeDirectives.length !== 1) return 0;

  const maxAge = Number(maxAgeDirectives[0].split("=")[1]);
  if (Number.isNaN(maxAge) || !Number.isInteger(maxAge) || maxAge < 0) return 0;

  return maxAge;
}

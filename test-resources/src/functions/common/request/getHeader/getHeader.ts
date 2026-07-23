export type Headers = Record<string, string | undefined>;

export const getHeader = (
  headers: Headers,
  header: string,
): string | undefined => {
  const [, headerValue] =
    Object.entries(headers)
      .reverse()
      .find(([key]) => key.toLowerCase() === header.toLowerCase()) ?? [];
  return headerValue;
};

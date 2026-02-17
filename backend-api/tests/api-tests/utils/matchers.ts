import { expect } from "@jest/globals";

const toBeValidUuid = (candidate: unknown) => {
  const pass = isValidUuid(candidate);
  return {
    pass,
    message: pass
      ? () => `expected ${candidate} not to be a valid UUID`
      : () => `expected ${candidate} to be a valid UUID`,
  };
};

const isValidUuid = (candidate: unknown): boolean => {
  if (typeof candidate !== "string") return false;
  const regexUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexUUID.test(candidate);
};

expect.extend({
  toBeValidUuid,
});

declare module "expect" {
  interface AsymmetricMatchers {
    toBeValidUuid(): void;
  }
}

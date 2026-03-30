import { describe, expect } from "@jest/globals";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

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

const expiryGracePeriodInDays = Number(
  process.env.EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS,
);

export function getDescribeForExpiryGracePeriodDisabledTests() {
  if (
    isValidExpiryGracePeriod(expiryGracePeriodInDays) &&
    expiryGracePeriodInDays > 0
  ) {
    return describe.skip;
  }

  return describe;
}

export function getDescribeForExpiryGracePeriodEnabledTests() {
  if (
    isValidExpiryGracePeriod(expiryGracePeriodInDays) &&
    expiryGracePeriodInDays === 0
  ) {
    return describe.skip;
  }

  return describe;
}

function isValidExpiryGracePeriod(expiryGracePeriod: any) {
  if (expiryGracePeriodInDays == null) return false;
  if (
    !Number.isNaN(expiryGracePeriod) &&
    typeof expiryGracePeriod === "number" &&
    expiryGracePeriod >= 0
  )
    return true;

  return false;
}

expect.extend({
  toBeValidUuid,
});

declare module "expect" {
  interface AsymmetricMatchers {
    toBeValidUuid(): void;
  }
}

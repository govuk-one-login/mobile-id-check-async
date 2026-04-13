import { describe } from "vitest";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

export const EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS: number =
  Number(process.env.EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS);
export const EXPIRY_GRACE_PERIOD_IN_DAYS_PLUS_1 =
  EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS + 1;

export function expiryGracePeriodDisabledDescribe() {
  throwIfExpiryGracePeriodNotValid(
    EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS,
  );
  if (EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS > 0) {
    return describe.skip;
  }

  return describe;
}

export function expiryGracePeriodEnabledDescribe() {
  throwIfExpiryGracePeriodNotValid(
    EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS,
  );

  if (EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS === 0) {
    return describe.skip;
  }

  return describe;
}

function throwIfExpiryGracePeriodNotValid(expiryGracePeriod: any) {
  if (expiryGracePeriod == null)
    throw new Error(
      "EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS is not set in test environment variables",
    );
  if (
    !Number.isNaN(expiryGracePeriod) &&
    typeof expiryGracePeriod === "number" &&
    expiryGracePeriod >= 0
  )
    return;

  throw new Error(
    `EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS is not valid: ${expiryGracePeriod}`,
  );
}

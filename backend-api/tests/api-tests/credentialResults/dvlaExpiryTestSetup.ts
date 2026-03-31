import dotenv from "dotenv";
dotenv.config({ quiet: true });

export const EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS: number =
  Number(process.env.EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS);
export const EXPIRY_GRACE_PERIOD_IN_DAYS_PLUS_1 =
  EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS + 1;

const expectedExpiryGracePeriodInDays =
  EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS;

export function expiryGracePeriodDisabledDescribe() {
  if (
    isValidExpiryGracePeriod(expectedExpiryGracePeriodInDays) &&
    expectedExpiryGracePeriodInDays > 0
  ) {
    return describe.skip;
  }

  return describe;
}

export function expiryGracePeriodEnabledDescribe() {
  if (
    isValidExpiryGracePeriod(expectedExpiryGracePeriodInDays) &&
    expectedExpiryGracePeriodInDays === 0
  ) {
    return describe.skip;
  }

  return describe;
}

function isValidExpiryGracePeriod(expiryGracePeriod: any) {
  if (expectedExpiryGracePeriodInDays == null) return false;
  if (
    !Number.isNaN(expiryGracePeriod) &&
    typeof expiryGracePeriod === "number" &&
    expiryGracePeriod >= 0
  )
    return true;

  return false;
}

export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
export const mockBiometricSessionId = "11111111-1111-1111-1111-111111111111";
export const mockInvalidUUID = "invalid-uuid";
export const mockExpiredSessionId = "mock-expired-session-id";
export const mockInvalidStateSessionId = "mock-invalid-state-session-id";
export const mockClientState = "mockClientState";
export const mockGovukSigninJourneyId = "44444444-4444-4444-4444-444444444444";
export const expectedSecurityHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};
const ONE_DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

export const generateRandomString = (): string => {
  return Math.random().toString(36);
};

function getIsoStringDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getIsoStringDateNDaysFromToday(numberOfDaysFromToday: number) {
  const NOW_IN_MILLISECONDS = Date.now();
  const numberOfDaysInMillis =
    ONE_DAY_IN_MILLIS * Math.abs(numberOfDaysFromToday);

  if (numberOfDaysFromToday < 0) {
    return getIsoStringDate(
      new Date(NOW_IN_MILLISECONDS - numberOfDaysInMillis),
    );
  }

  return getIsoStringDate(new Date(NOW_IN_MILLISECONDS + numberOfDaysInMillis));
}

/**
 * Adds/subtracts `n` number of months and `d` number of days from the current date
 * @param {number} numberOfMonthsFromToday - The number of months from today's date
 * @param {number} additionalDays - Additional days to add/subtract after the month calculation
 * @returns {object} An object with dates in `dd.MM.yyyy` and `yyyy-MM-dd` formats.
 */
export function getDateNMonthsAndDaysFromToday(
  numberOfMonthsFromToday: number,
  additionalDays: number = 0,
) {
  const dateNow = new Date(Date.now());
  const dateWithMonths = addMonthsToDate(dateNow, numberOfMonthsFromToday);
  const dateWithDays = addDaysToDate(dateWithMonths, additionalDays);
  const isoDate = getIsoStringDate(dateWithDays);

  return {
    ddMMyyyyDotFormat: formatISODateStringToDate(isoDate),
    yyyyMMddDashFormat: isoDate,
  };
}

export function addMonthsToDate(inputDate: Date, months: number): Date {
  const newDate = new Date(
    Date.UTC(
      inputDate.getUTCFullYear(),
      inputDate.getUTCMonth() + months,
      inputDate.getUTCDate(),
      inputDate.getUTCHours(),
      inputDate.getUTCMinutes(),
      inputDate.getUTCSeconds(),
    ),
  );
  // handles overflow issues when date of input month exceeds last date in target month, such that e.g. 2023-01-29 will
  // increment to 2023-02-28, instead of 2023-03-01
  // Date.setUTCDate(0) sets the day of the month to the last day of the previous month
  if (newDate.getUTCDate() !== inputDate.getUTCDate()) {
    newDate.setUTCDate(0);
  }
  return newDate;
}

function addDaysToDate(inputDate: Date, days: number): Date {
  return new Date(inputDate.getTime() + days * ONE_DAY_IN_MILLIS);
}

function formatISODateStringToDate(date: string): string {
  return date.split("-").reverse().join(".");
}

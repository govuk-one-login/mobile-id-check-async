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

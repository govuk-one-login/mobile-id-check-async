export function isString(field: unknown): field is string {
  return typeof field === "string";
}

export function isValidUUIDv4(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
}

export function isOlderThan60Minutes(createdAtInMilliseconds: number) {
  const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
  const validFrom = Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;
  return createdAtInMilliseconds < validFrom;
}

export function oneHourAgoInMilliseconds() {
  const oneHourinMilliseconds = 60 * 60 * 1000;
  return Date.now() - oneHourinMilliseconds;
}

export function isSessionExpired(createdAtInMilliseconds: number) {
  return isOlderThan60Minutes(createdAtInMilliseconds);
}

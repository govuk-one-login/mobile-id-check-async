export function getTimeToLiveInSeconds(ttlDuration: string) {
  return Math.floor(Date.now() / 1000) + Number(ttlDuration);
}

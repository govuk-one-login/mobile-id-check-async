export interface ICredentialResultData {
  sub: string;
  sentTimestamp: string;
  event: Event;
  timeToLiveInSeconds: number;
}

export interface Event {
  [key: string]: string;
}

export interface ICredentialResultData {
  sub: string;
  sentTimestamp: string;
  event: Event;
  timeToLiveInSeconds: number;
}

export type Event = Record<string, string>;

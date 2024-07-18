import { ErrorOrSuccess } from "../../types/errorOrValue";

export interface IWriteEvent {
  writeEvent: (eventName: EventName) => ErrorOrSuccess<null>;
}

export type EventName = "DCMAW_ASYNC_CRI_5XXERROR";

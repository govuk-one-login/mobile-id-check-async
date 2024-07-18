import { ErrorOrSuccess } from "../../types/errorOrValue";

export interface IWriteEvent {
  writeEvent: (eventName: string) => ErrorOrSuccess<null>;
}

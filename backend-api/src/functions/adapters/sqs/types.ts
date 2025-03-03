import { TxmaEvents } from "../../services/events/types";

export type AsyncSqsMessages = VendorProcessingMessage | TxmaEvents;

interface VendorProcessingMessage {
  biometricSessionId: string;
  sessionId: string;
}

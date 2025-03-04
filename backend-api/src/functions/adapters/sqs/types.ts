import { TxmaEvents } from "../../services/events/types";

export type SqsMessageBodies = VendorProcessingMessage | TxmaEvents;

interface VendorProcessingMessage {
  biometricSessionId: string;
  sessionId: string;
}

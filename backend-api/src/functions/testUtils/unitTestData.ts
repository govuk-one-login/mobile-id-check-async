import { SessionRegistry } from "../common/session/SessionRegistry";
import { IEventService } from "../services/events/eventService";

export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";

export const expectedSecurityHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export const NOW_IN_MILLISECONDS: number = 1704110400000; // 2024-01-01 12:00:00.000

export const mockInertSessionRegistry: SessionRegistry = {
  updateSession: jest.fn(() => {
    throw new Error("Not implemented");
  }),
};

export const mockInertEventService: IEventService = {
  writeGenericEvent: jest.fn(() => {
    throw new Error("Not implemented");
  }),
  writeCredentialTokenIssuedEvent: jest.fn(() => {
    throw new Error("Not implemented");
  }),
};

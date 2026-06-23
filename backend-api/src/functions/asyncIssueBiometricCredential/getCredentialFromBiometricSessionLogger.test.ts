import { logger } from "../common/logging/logger";
import "../../../tests/testUtils/matchers";
import { getCredentialFromBiometricSessionLogger } from "./getCredentialFromBiometricSessionLogger";
import {
  vi,
  expect,
  it,
  describe,
  beforeEach,
  type MockInstance,
} from "vitest";

describe("getCredentialFromBiometricSessionLogger", () => {
  let consoleInfoSpy: MockInstance;
  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info");
  });

  it("Logs at info", () => {
    logger.appendPersistentKeys({ mockKey: "mockValue" });
    getCredentialFromBiometricSessionLogger.info("DRIVING_LICENCE_ISSUER", {});
    expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
      message: "DRIVING_LICENCE_ISSUER",
      mockKey: "mockValue",
    });
  });
});

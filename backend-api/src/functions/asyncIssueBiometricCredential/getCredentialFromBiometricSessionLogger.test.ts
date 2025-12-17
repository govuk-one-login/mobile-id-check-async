import { logger } from "../common/logging/logger";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { getCredentialFromBiometricSessionLogger } from "./getCredentialFromBiometricSessionLogger";

describe("getCredentialFromBiometricSessionLogger", () => {
  let consoleInfoSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, "info");
  });

  it("Logs", () => {
    logger.appendPersistentKeys({ mockKey: "mockValue" });
    getCredentialFromBiometricSessionLogger.info("DRIVING_LICENCE_ISSUER", {});
    expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
      message: "DRIVING_LICENCE_ISSUER",
      mockKey: "mockValue",
    });
  });
});

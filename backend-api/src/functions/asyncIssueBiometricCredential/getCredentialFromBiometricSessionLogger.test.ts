import { logger } from "../common/logging/logger";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { getCredentialFromBiometricSessionLogger } from "./getCredentialFromBiometricSessionLogger";

describe("getCredentialFromBiometricSessionLogger", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error");
    consoleInfoSpy = jest.spyOn(console, "info");
  });

  it("Logs at error", () => {
    logger.appendPersistentKeys({ mockKey: "mockValue" });
    getCredentialFromBiometricSessionLogger.error(
      "DRIVING_LICENCE_INVALID_ISSUER",
      {},
    );
    expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
      message: "DRIVING_LICENCE_INVALID_ISSUER",
      mockKey: "mockValue",
    });
    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });

  it("Logs at info", () => {
    logger.appendPersistentKeys({ mockKey: "mockValue" });
    getCredentialFromBiometricSessionLogger.info("DRIVING_LICENCE_ISSUER", {});
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
      message: "DRIVING_LICENCE_ISSUER",
      mockKey: "mockValue",
    });
  });
});

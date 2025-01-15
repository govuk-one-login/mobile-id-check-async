import { emptyFailure, successResult } from "../../utils/result";
import { getBiometricToken } from "./getBiometricToken";

describe("getBiometricToken", () => {
  describe("Given there is an error making network request", () => {
    it("Returns an empty failure", async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("Unexpected network error")),
      ) as jest.Mock;

      const result = await getBiometricToken("mockUrl", "mockSubmitterKey");

      expect(result).toEqual(emptyFailure());
    });
  });

  describe("Given the response is invalid", () => {
    describe("Given response is undefined", () => {
      it("Returns an empty failure", async () => {
        /// Write test
      });
    });

    describe("Given response body is undefined", () => {
      it("Returns an empty failure", async () => {
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            headers: new Headers({ "Content-Type": "text/plain" }),
            text: () => Promise.resolve(null),
          } as unknown as Response),
        ) as jest.Mock;

        const result = await getBiometricToken("mockUrl", "mockSubmitterKey");

        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given response body cannot be parsed", () => {
      it("Returns an empty failure", async () => {
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            headers: new Headers({ "Content-Type": "text/plain" }),
            text: () => Promise.resolve("Invalid JSON"),
          } as Response),
        ) as jest.Mock;

        const result = await getBiometricToken("mockUrl", "mockSubmitterKey");

        expect(result).toEqual(emptyFailure());
      });
    });
  });

  describe("Given valid request is made", () => {
    it("Returns successResult containing biometric token", async () => {
      const mockData = JSON.stringify({ access_token: "mockBiometricToken" });
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          headers: new Headers({ "Content-Type": "text/plain" }),
          text: () => Promise.resolve(mockData),
        } as Response),
      ) as jest.Mock;

      const result = await getBiometricToken("mockUrl", "mockSubmitterKey");

      expect(result).toEqual(successResult("mockBiometricToken"));
    });
  });
});

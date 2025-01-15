import { successResult } from "../../utils/result";
import { getBiometricToken } from "./getBiometricToken";

describe("getBiometricToken", () => {
  describe("Given there is an error making network request", () => {
    it("Returns an empty failure", async () => {
      /// Write test
    })
  })

  describe("Given the response is invalid", () => {
    describe("Given response is undefined", () => {
      it("Returns an empty failure", async () => {
        /// Write test
      })
    })

    describe("Given response body is undefined", () => {
      it("Returns an empty failure", async () => {
        /// Write test
      })
    })

    describe("Given response body cannot be parsed", () => {
      it("Returns an empty failure", async () => {
        /// Write test
      })
    })
  })

  describe("Given valid request is made", () => {
    it("Returns successResult containing biometric token", async () => {
      const result = await getBiometricToken("mockUrl", "mockSubmitterKey");

      expect(result).toEqual(successResult("mockBiometricToken"));
    });
  })
});

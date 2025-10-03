import { expect } from "@jest/globals";
import { buildUserAgent } from "./setupLogger";

describe("buildUserAgent", () => {
  describe("User-Agent is empty string", () => {
    it("identifies as unknown deviceType", () => {
      expect(buildUserAgent("")).toStrictEqual({
        userAgentHeader: "",
        deviceType: "unknown",
      });
    });
  });

  describe("User-Agent is absent", () => {
    it("identifies as unknown deviceType", () => {
      expect(buildUserAgent(undefined)).toStrictEqual({
        userAgentHeader: "",
        deviceType: "unknown",
      });
    });
  });

  describe("User-Agent is non-mobile", () => {
    it("identifies as unknown deviceType a non-mobile-phone kind of non-empty UA", () => {
      expect(buildUserAgent("axios/1.12.2")).toStrictEqual({
        userAgentHeader: "axios/1.12.2",
        deviceType: "unknown",
      });
    });
  });

  describe("User-Agent is Androidy", () => {
    it("identifies as Android a UA containing Android/", () => {
      const androidUA =
        "One Login/0.25.8 samsung/SM-G996B Android/35 Ktor/3.0.3";
      expect(buildUserAgent(androidUA)).toStrictEqual({
        userAgentHeader: androidUA,
        deviceType: "Android",
      });
    });

    it("identifies as Android a UA containing Dalvik/", () => {
      const androidDalvikUA =
        "Dalvik/2.1.0 (Linux; U; Android 15; SM-S928B Build/AP3A.240905.015.A2)";
      expect(buildUserAgent(androidDalvikUA)).toStrictEqual({
        userAgentHeader: androidDalvikUA,
        deviceType: "Android",
      });
    });
  });

  describe("User-Agent is iPhoney", () => {
    it("identifies as iPhone a UA containing iOS/", () => {
      const iPhoneiOsUa =
        "OneLogin/1.9.0 iPhone15,2 iOS/18.6.2 CFNetwork/1.0 Darwin/24.6.0";
      expect(buildUserAgent(iPhoneiOsUa)).toStrictEqual({
        userAgentHeader: iPhoneiOsUa,
        deviceType: "iPhone",
      });
    });

    it("identifies as iPhone a UA containing Darwin/", () => {
      const iPhoneDarwinUa = "OneLogin/2 Darwin/24.6.0 CFNetwork/1.0";
      expect(buildUserAgent(iPhoneDarwinUa)).toStrictEqual({
        userAgentHeader: iPhoneDarwinUa,
        deviceType: "iPhone",
      });
    });
  });
});

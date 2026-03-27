import { getIsoStringDateNDaysFromToday } from "./apiTestData";

describe("API Test Data", () => {
  describe("getIsoStringDateNDaysFromToday", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    describe("Today is 2024-01-01", () => {
      beforeEach(() => {
        jest.setSystemTime(1704110400000); // Monday, January 1, 2024 at 12:00:00 PM
      });
      it("Returns yesterday's date", () => {
        const result = getIsoStringDateNDaysFromToday(-1);
        expect(result).toBe("2023-12-31");
      });
      it("Returns today's date", () => {
        const result = getIsoStringDateNDaysFromToday(0);
        expect(result).toBe("2024-01-01");
      });
      it("Returns tomorrow's date", () => {
        const result = getIsoStringDateNDaysFromToday(1);
        expect(result).toBe("2024-01-02");
      });
    });

    describe("Today is 2024-03-01 (leap year)", () => {
      beforeEach(() => {
        jest.setSystemTime(1709294400000); // Friday, March 1, 2024 at 12:00:00 PM
      });
      it("Returns yesterday's date", () => {
        const result = getIsoStringDateNDaysFromToday(-1);
        expect(result).toBe("2024-02-29");
      });
      it("Returns today's date", () => {
        const result = getIsoStringDateNDaysFromToday(0);
        expect(result).toBe("2024-03-01");
      });
      it("Returns tomorrow's date", () => {
        const result = getIsoStringDateNDaysFromToday(1);
        expect(result).toBe("2024-03-02");
      });
    });

    describe("Today is 2023-03-01 (not a leap year)", () => {
      beforeEach(() => {
        jest.setSystemTime(1677672000000); // Wednesday, March 1, 2023 at 12:00:00 PM
      });
      it("Returns yesterday's date", () => {
        const result = getIsoStringDateNDaysFromToday(-1);
        expect(result).toBe("2023-02-28");
      });
      it("Returns today's date", () => {
        const result = getIsoStringDateNDaysFromToday(0);
        expect(result).toBe("2023-03-01");
      });
      it("Returns tomorrow's date", () => {
        const result = getIsoStringDateNDaysFromToday(1);
        expect(result).toBe("2023-03-02");
      });
    });
  });
});

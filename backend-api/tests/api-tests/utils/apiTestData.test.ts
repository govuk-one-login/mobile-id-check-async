import {
  getDateNMonthsAndDaysFromToday,
  getIsoStringDateNDaysFromToday,
} from "./apiTestData";
import { vi, expect, it, describe, beforeEach, afterEach } from "vitest";

describe("API Test Data", () => {
  describe("getIsoStringDateNDaysFromToday", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    describe("Today is 2024-01-01", () => {
      beforeEach(() => {
        vi.setSystemTime(1704110400000); // Monday, January 1, 2024 at 12:00:00 PM
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
        vi.setSystemTime(1709294400000); // Friday, March 1, 2024 at 12:00:00 PM
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
        vi.setSystemTime(1677672000000); // Wednesday, March 1, 2023 at 12:00:00 PM
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

  describe("getDateNMonthsAndDaysFromToday", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("months only", () => {
      describe.each([
        [
          "Adds 0 months (returns today)",
          "2023-01-15T00:00:00Z",
          0,
          { ddMMyyyyDotFormat: "15.01.2023", yyyyMMddDashFormat: "2023-01-15" },
        ],
        [
          "Adds one month to a mid-month date (no overflow)",
          "2023-01-15T00:00:00Z",
          1,
          { ddMMyyyyDotFormat: "15.02.2023", yyyyMMddDashFormat: "2023-02-15" },
        ],
        [
          "Subtracts one month to a mid-month date (no overflow)",
          "2023-02-15T00:00:00Z",
          -1,
          { ddMMyyyyDotFormat: "15.01.2023", yyyyMMddDashFormat: "2023-01-15" },
        ],
        [
          "Adds eighteen months (crosses year boundary)",
          "2023-01-01T00:00:00Z",
          18,
          { ddMMyyyyDotFormat: "01.07.2024", yyyyMMddDashFormat: "2024-07-01" },
        ],
        [
          "Subtracts eighteen months (crosses year boundary)",
          "2023-01-01T00:00:00Z",
          -18,
          { ddMMyyyyDotFormat: "01.07.2021", yyyyMMddDashFormat: "2021-07-01" },
        ],
        [
          "Adds one month when target month is shorter (Jan 31 → Feb 28)",
          "2023-01-31T00:00:00Z",
          1,
          { ddMMyyyyDotFormat: "28.02.2023", yyyyMMddDashFormat: "2023-02-28" },
        ],
        [
          "Subtracts one month when target month is shorter (Mar 31 → Feb 28)",
          "2023-03-31T00:00:00Z",
          -1,
          { ddMMyyyyDotFormat: "28.02.2023", yyyyMMddDashFormat: "2023-02-28" },
        ],
        [
          "Adds one month when target month is shorter in leap year (Jan 31 → Feb 29)",
          "2024-01-31T00:00:00Z",
          1,
          { ddMMyyyyDotFormat: "29.02.2024", yyyyMMddDashFormat: "2024-02-29" },
        ],
        [
          "Ignores time component",
          "2023-01-01T23:59:59Z",
          1,
          { ddMMyyyyDotFormat: "01.02.2023", yyyyMMddDashFormat: "2023-02-01" },
        ],
      ])("%s", (_description, currentDate, numberOfMonths, expectedOutput) => {
        it("Returns the correct date object", () => {
          vi.setSystemTime(new Date(currentDate));

          const actualOutput = getDateNMonthsAndDaysFromToday(numberOfMonths);

          expect(actualOutput).toEqual(expectedOutput);
        });
      });
    });

    describe("months and days", () => {
      describe("non-zero months", () => {
        describe.each([
          [
            "Adds months and days (both positive)",
            "2024-01-15T12:00:00Z",
            1,
            5,
            {
              ddMMyyyyDotFormat: "20.02.2024",
              yyyyMMddDashFormat: "2024-02-20",
            },
          ],
          [
            "Subtracts months and days (both negative)",
            "2024-01-15T12:00:00Z",
            -1,
            -5,
            {
              ddMMyyyyDotFormat: "10.12.2023",
              yyyyMMddDashFormat: "2023-12-10",
            },
          ],
          [
            "Adds months but subtracts days",
            "2024-02-15T12:00:00Z",
            1,
            -5,
            {
              ddMMyyyyDotFormat: "10.03.2024",
              yyyyMMddDashFormat: "2024-03-10",
            },
          ],
          [
            "Subtracts months but adds days",
            "2024-02-15T12:00:00Z",
            -1,
            5,
            {
              ddMMyyyyDotFormat: "20.01.2024",
              yyyyMMddDashFormat: "2024-01-20",
            },
          ],
          [
            "Calculates 18 months and 1 day in the past",
            "2024-01-15T12:00:00Z",
            -18,
            -1,
            {
              ddMMyyyyDotFormat: "14.07.2022",
              yyyyMMddDashFormat: "2022-07-14",
            },
          ],
        ])(
          "%s",
          (
            _description,
            currentDate,
            numberOfMonths,
            additionalDays,
            expectedOutput,
          ) => {
            it("Returns the correct date object", () => {
              vi.setSystemTime(new Date(currentDate));

              const result = getDateNMonthsAndDaysFromToday(
                numberOfMonths,
                additionalDays,
              );

              expect(result).toEqual(expectedOutput);
            });
          },
        );
      });

      describe("zero months (days only)", () => {
        describe.each([
          [
            "Adds days within same month",
            "2024-01-15T12:00:00Z",
            0,
            10,
            {
              ddMMyyyyDotFormat: "25.01.2024",
              yyyyMMddDashFormat: "2024-01-25",
            },
          ],
          [
            "Subtracts days within same month",
            "2024-01-15T12:00:00Z",
            0,
            -10,
            {
              ddMMyyyyDotFormat: "05.01.2024",
              yyyyMMddDashFormat: "2024-01-05",
            },
          ],
          [
            "Adds days crossing month boundary",
            "2024-01-25T12:00:00Z",
            0,
            10,
            {
              ddMMyyyyDotFormat: "04.02.2024",
              yyyyMMddDashFormat: "2024-02-04",
            },
          ],
          [
            "Subtracts days crossing month boundary",
            "2024-02-05T12:00:00Z",
            0,
            -10,
            {
              ddMMyyyyDotFormat: "26.01.2024",
              yyyyMMddDashFormat: "2024-01-26",
            },
          ],
          [
            "Adds days crossing year boundary",
            "2023-12-28T12:00:00Z",
            0,
            10,
            {
              ddMMyyyyDotFormat: "07.01.2024",
              yyyyMMddDashFormat: "2024-01-07",
            },
          ],
          [
            "Subtracts days crossing year boundary",
            "2024-01-07T12:00:00Z",
            0,
            -10,
            {
              ddMMyyyyDotFormat: "28.12.2023",
              yyyyMMddDashFormat: "2023-12-28",
            },
          ],
          [
            "Adds days crossing Feb to March in non-leap year",
            "2023-02-26T12:00:00Z",
            0,
            5,
            {
              ddMMyyyyDotFormat: "03.03.2023",
              yyyyMMddDashFormat: "2023-03-03",
            },
          ],
          [
            "Adds days crossing Feb to March in leap year",
            "2024-02-26T12:00:00Z",
            0,
            5,
            {
              ddMMyyyyDotFormat: "02.03.2024",
              yyyyMMddDashFormat: "2024-03-02",
            },
          ],
          [
            "Subtracts days crossing March to Feb in non-leap year",
            "2023-03-03T12:00:00Z",
            0,
            -5,
            {
              ddMMyyyyDotFormat: "26.02.2023",
              yyyyMMddDashFormat: "2023-02-26",
            },
          ],
          [
            "Subtracts days crossing March to Feb in leap year",
            "2024-03-03T12:00:00Z",
            0,
            -5,
            {
              ddMMyyyyDotFormat: "27.02.2024",
              yyyyMMddDashFormat: "2024-02-27",
            },
          ],
        ])(
          "%s",
          (
            _description,
            currentDate,
            numberOfMonths,
            additionalDays,
            expectedOutput,
          ) => {
            it("Returns the correct date object", () => {
              vi.setSystemTime(new Date(currentDate));

              const result = getDateNMonthsAndDaysFromToday(
                numberOfMonths,
                additionalDays,
              );

              expect(result).toEqual(expectedOutput);
            });
          },
        );
      });
    });
  });
});

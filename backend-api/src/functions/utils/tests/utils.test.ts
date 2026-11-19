import { isStringArray } from "../utils";
import { expect, it, describe } from "vitest";

describe("isStringArray", () => {
  describe.each([
    {
      scenario: "Given null",
      input: null,
      expectedResult: false,
    },
    {
      scenario: "Given undefined",
      input: undefined,
      expectedResult: false,
    },
    {
      scenario: "Given an empty array",
      input: [],
      expectedResult: false,
    },
    {
      scenario: "Given array of 2 numbers",
      input: [123, 456],
      expectedResult: false,
    },
    {
      scenario: "Given array of mixed values",
      input: [123, "def", false],
      expectedResult: false,
    },
    {
      scenario: "Given array of 2 strings",
      input: ["abc", "def"],
      expectedResult: true,
    },
  ])("$scenario", ({ input, expectedResult }) => {
    it(`Checks the type ${expectedResult ? "is" : "is not"} a string array`, () => {
      expect(isStringArray(input)).toEqual(expectedResult);
    });
  });
});

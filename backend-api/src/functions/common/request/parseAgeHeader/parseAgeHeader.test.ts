import { parseAgeHeader } from "./parseAgeHeader";

const testData = [
  {
    scenario: "Given `Age` header is undefined",
    ageHeaderValue: undefined,
    expectedAge: 0,
  },
  {
    scenario: "Given `Age` header is a not a number",
    ageHeaderValue: "a",
    expectedAge: 0,
  },
  {
    scenario: "Given `Age` header is a not an integer",
    ageHeaderValue: "3.14",
    expectedAge: 0,
  },
  {
    scenario: "Given `Age` header is less than 0",
    ageHeaderValue: "-100",
    expectedAge: 0,
  },
  {
    scenario: "Given `Age` header is a valid value",
    ageHeaderValue: "100",
    expectedAge: 100,
  },
];

describe("parseCacheControlHeader", () => {
  describe.each(testData)("$scenario", ({ ageHeaderValue, expectedAge }) => {
    it(`Returns age value of ${expectedAge}`, () => {
      expect(parseAgeHeader(ageHeaderValue)).toEqual(expectedAge);
    });
  });
});

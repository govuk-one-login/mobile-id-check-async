import { parseCacheControlHeader } from "./parseCacheControlHeader";

const testData = [
  {
    scenario: "Given header is undefined",
    cacheControlHeaderValue: undefined,
    expectedMaxAge: 0,
  },
  {
    scenario: "Given header does not include max-age directive",
    cacheControlHeaderValue: "no-store",
    expectedMaxAge: 0,
  },
  {
    scenario: "Given header contains multiple max-age directives",
    cacheControlHeaderValue: "max-age=60, max-age=120",
    expectedMaxAge: 0,
  },
  {
    scenario:
      "Given header contains multiple max-age directives with different casing",
    cacheControlHeaderValue: "max-age=60, MaX-aGe=120",
    expectedMaxAge: 0,
  },
  {
    scenario: "Given header contains max-age directive without a value",
    cacheControlHeaderValue: "max-age",
    expectedMaxAge: 0,
  },
  {
    scenario:
      "Given header contains max-age directive with a non-numeric value",
    cacheControlHeaderValue: "max-age=invalid",
    expectedMaxAge: 0,
  },
  {
    scenario:
      "Given header contains max-age directive with a non-integer numeric value",
    cacheControlHeaderValue: "max-age=1.5",
    expectedMaxAge: 0,
  },
  {
    scenario:
      "Given header contains max-age directive with a negative integer value",
    cacheControlHeaderValue: "max-age=-1",
    expectedMaxAge: 0,
  },
  {
    scenario:
      "Given header contains valid max-age directive (non-negative integer value)",
    cacheControlHeaderValue: "max-age=60",
    expectedMaxAge: 60,
  },
  {
    scenario:
      "Given header contains valid max-age directive with other directives",
    cacheControlHeaderValue: "max-age=60, public",
    expectedMaxAge: 60,
  },
  {
    scenario:
      "Given header contains valid max-age directive with other directives and padding",
    cacheControlHeaderValue: "public, max-age=60",
    expectedMaxAge: 60,
  },
  {
    scenario:
      "Given header contains valid max-age directive not in all lowercase",
    cacheControlHeaderValue: "public, MaX-aGe=60",
    expectedMaxAge: 60,
  },
];

describe("parseCacheControlHeader", () => {
  describe.each(testData)(
    "$scenario",
    ({ cacheControlHeaderValue, expectedMaxAge }) => {
      it(`Returns max age value of ${expectedMaxAge}`, () => {
        expect(parseCacheControlHeader(cacheControlHeaderValue)).toEqual({
          maxAge: expectedMaxAge,
        });
      });
    },
  );
});

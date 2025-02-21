import { getHeader } from "./getHeader";

describe("Headers", () => {
  describe("getHeader", () => {
    describe("Given no headers are present", () => {
      it("Returns undefined", () => {
        expect(getHeader({}, "example-header")).toBeUndefined();
      });
    });

    describe("Given header is not present", () => {
      it("Returns undefined", () => {
        expect(
          getHeader(
            { "example-header": "example-value" },
            "another-example-header",
          ),
        ).toBeUndefined();
      });
    });

    describe("Given header is present and casing is identical", () => {
      it("Returns header value", () => {
        expect(
          getHeader({ "example-header": "example-value" }, "example-header"),
        ).toBe("example-value");
      });
    });

    describe("Given header is present in lowercase and uppercase header is requested", () => {
      it("Returns header value", () => {
        expect(
          getHeader({ "example-header": "example-value" }, "EXAMPLE-HEADER"),
        ).toBe("example-value");
      });
    });

    describe("Given header is present in uppercase and lowercase header is requested", () => {
      it("Returns header value", () => {
        expect(
          getHeader({ "EXAMPLE-HEADER": "example-value" }, "example-header"),
        ).toBe("example-value");
      });
    });

    describe("Given header is present in arbitrary case and arbitrarily cased header is requested", () => {
      it("Returns header value", () => {
        expect(
          getHeader({ "ExAmpLe-hEADer": "example-value" }, "examPlE-HEadEr"),
        ).toBe("example-value");
      });
    });

    describe("Given header is present with multiple casings", () => {
      it("Returns header value of last defined header", () => {
        expect(
          getHeader(
            {
              "example-header": "example-value",
              "EXAMPLE-HEADER": "another-example-value",
            },
            "example-header",
          ),
        ).toBe("another-example-value");
      });
    });
  });
});

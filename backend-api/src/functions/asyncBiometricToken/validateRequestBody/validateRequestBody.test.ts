import { validateRequestBody } from "./validateRequestBody";

describe("Validate request body", () => {
  describe("Given body is invalid", () => {
    describe.each([
      [
        "Given body is null or undefined",
        null,
        "Request body is either null or undefined.",
      ],
      [
        "Given body cannot be parsed as JSON",
        "invalidJSON",
        `Request body could not be parsed as JSON. SyntaxError: Unexpected token 'i', "invalidJSON" is not valid JSON`,
      ],
    ])("%s", (_description, body, errorMessage) => {
      it("Returns an error result", () => {
        const result = validateRequestBody(body);

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage,
          },
        });
      });
    });

    describe.each([
      [
        "Given sessionId is not present",
        {},
        "sessionId in request body is either null or undefined.",
      ],
      [
        "Given sessionId is not a string",
        { sessionId: 123 },
        "sessionId in request body is not of type string. sessionId: 123",
      ],
      [
        "Given sessionId is an empty string",
        { sessionId: "" },
        "sessionId in request body is an empty string.",
      ],
      [
        "Given documentType is not present",
        { sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4" },
        "documentType in request body is either null or undefined.",
      ],
      [
        "Given documentType is not a string",
        {
          sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
          documentType: 123,
        },
        "documentType in request body is not of type string. documentType: 123",
      ],
      [
        "Given documentType is an empty string",
        { sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4", documentType: "" },
        "documentType in request body is an empty string.",
      ],
      [
        "Given documentType is an invalid document type",
        {
          sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
          documentType: "BUS_PASS",
        },
        "documentType in request body is invalid. documentType: BUS_PASS",
      ],
    ])("%s", (_description, body, errorMessage) => {
      it("Returns an error result", () => {
        const result = validateRequestBody(JSON.stringify(body));

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage,
          },
        });
      });
    });
  });

  describe("Given body is valid", () => {
    it("Returns a successResult with a valid parsed body as value", () => {
      const result = validateRequestBody(
        JSON.stringify({
          sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
          documentType: "NFC_PASSPORT",
        }),
      );

      expect(result).toStrictEqual({
        isError: false,
        value: {
          sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
          documentType: "NFC_PASSPORT",
        },
      });
    });
  });
});

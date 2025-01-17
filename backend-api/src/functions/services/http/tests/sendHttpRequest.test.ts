import { sendHttpRequest, SuccessfulHttpResponse } from "../sendHttpRequest";

describe("Send HTTP request", () => {
  const MOCK_JITTER_MULTIPLIER = 0.5;
  const httpRequest = {
    url: "https://mockEndpoint.com",
    method: "GET",
  } as const;
  const retryConfig = { maxAttempts: 3, delayInMillis: 10 };

  let mockFetch: jest.SpyInstance;
  let mockSetTimeout: jest.SpyInstance;
  let response: SuccessfulHttpResponse;

  beforeEach(() => {
    mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        headers: new Headers({
          header: "mockHeader",
        }),
        text: () => Promise.resolve(JSON.stringify({ mock: "responseBody" })),
      } as Response),
    );

    jest.spyOn(Math, "random").mockImplementation(() => MOCK_JITTER_MULTIPLIER);

    mockSetTimeout = jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback, _) => {
        callback();
        return {} as NodeJS.Timeout;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given there is a network error", () => {
    beforeEach(() => {
      mockFetch = jest
        .spyOn(global, "fetch")
        .mockImplementation(() => Promise.reject(new Error("mockError")));
    });
    it("Throws the error", async () => {
      await expect(sendHttpRequest(httpRequest, retryConfig)).rejects.toThrow(
        "Unexpected network error - Error: mockError",
      );
    });
  });

  describe("Given the request fails with a 500 error", () => {
    beforeEach(() => {
      mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 500,
          ok: false,
          text: () => Promise.resolve("mockErrorInformation"),
        } as Response),
      );
    });
    it("Throws an error", async () => {
      await expect(sendHttpRequest(httpRequest, retryConfig)).rejects.toThrow(
        "Error making http request - mockErrorInformation",
      );
    });
  });

  describe("Retry policy", () => {
    describe("Given there is an error on the first request attempt", () => {
      beforeEach(async () => {
        mockFetch = jest
          .spyOn(global, "fetch")
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
          .mockImplementationOnce(() =>
            Promise.resolve({
              status: 200,
              ok: true,
              headers: new Headers({
                header: "mockHeader",
              }),
              text: () =>
                Promise.resolve(JSON.stringify({ mock: "responseBody" })),
            } as Response),
          );

        response = await sendHttpRequest(httpRequest, retryConfig);
      });
      it("Attempts to send the request a second time", () => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("Delays successive attempts with exponential backoff", () => {
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
      });

      it("Returns success http response details from final response", () => {
        expect(response).toEqual({
          body: '{"mock":"responseBody"}',
          headers: { header: "mockHeader" },
          statusCode: 200,
        });
      });
    });

    describe("Given there is an error on the second request attempt", () => {
      beforeEach(async () => {
        mockFetch = jest
          .spyOn(global, "fetch")
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
          .mockImplementationOnce(() =>
            Promise.resolve({
              status: 200,
              ok: true,
              headers: new Headers({
                header: "mockHeader",
              }),
              text: () =>
                Promise.resolve(JSON.stringify({ mock: "responseBody" })),
            } as Response),
          );

        response = await sendHttpRequest(httpRequest, retryConfig);
      });
      it("Attempts to send the request a third time", () => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it("Delays successive attempts with exponential backoff", () => {
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          2,
          expect.any(Function),
          20 * MOCK_JITTER_MULTIPLIER,
        );
      });

      it("Returns success http response details from final response", () => {
        expect(response).toEqual({
          body: '{"mock":"responseBody"}',
          headers: { header: "mockHeader" },
          statusCode: 200,
        });
      });
    });

    describe("Given there is an error on the third request attempt", () => {
      beforeEach(async () => {
        mockFetch = jest
          .spyOn(global, "fetch")
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")));

        await expect(sendHttpRequest(httpRequest, retryConfig)).rejects.toThrow(
          "Unexpected network error - Error: mockError",
        );
      });

      it("Does not attempt to make request for a 4th time", () => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it("Delays successive attempts with exponential backoff", () => {
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          2,
          expect.any(Function),
          20 * MOCK_JITTER_MULTIPLIER,
        );
      });
    });
  });
});

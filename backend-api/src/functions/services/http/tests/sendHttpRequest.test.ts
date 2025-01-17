import { sendHttpRequest } from "../sendHttpRequest";

describe("Send HTTP request", () => {
  const MOCK_JITTER_MULTIPLIER = 0.5;

  let mockFetch: jest.SpyInstance;
  let mockSetTimeout: jest.SpyInstance;

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
    it("Throws the error", async () => {
      mockFetch = jest
        .spyOn(global, "fetch")
        .mockImplementation(() => Promise.reject(new Error("mockError")));

      await expect(
        sendHttpRequest(
          {
            url: "https://mockEndpoint.com",
            method: "GET",
          },
          { maxAttempts: 3, delayInMillis: 1 },
        ),
      ).rejects.toThrow("Unexpected network error - Error: mockError");
    });
  });

  describe("Given the request fails with a 500 error", () => {
    it("Throws an error", async () => {
      mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 500,
          ok: false,
          text: () => Promise.resolve("mockErrorInformation"),
        } as Response),
      );

      await expect(
        sendHttpRequest(
          {
            url: "https://mockEndpoint.com",
            method: "GET",
          },
          { maxAttempts: 3, delayInMillis: 1 },
        ),
      ).rejects.toThrow("Error making http request - mockErrorInformation");
    });
  });

  describe("Retry policy", () => {
    describe("Given there is an error on the first request attempt", () => {
      it("Attempts to send the request a second time", async () => {
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
        const response = await sendHttpRequest(
          {
            url: "https://mockEndpoint.com",
            method: "GET",
          },
          { maxAttempts: 3, delayInMillis: 10 },
        );

        expect(response).toEqual({
          body: '{"mock":"responseBody"}',
          headers: { header: "mockHeader" },
          statusCode: 200,
        });
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
      });
    });

    describe("Given there is an error on the second request attempt", () => {
      it("Attempts to send the request a third time", async () => {
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
        const response = await sendHttpRequest(
          {
            url: "https://mockEndpoint.com",
            method: "GET",
          },
          { maxAttempts: 3, delayInMillis: 10 },
        );

        expect(response).toEqual({
          body: '{"mock":"responseBody"}',
          headers: { header: "mockHeader" },
          statusCode: 200,
        });
        expect(mockFetch).toHaveBeenCalledTimes(3);
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

    describe("Given there is an error on the third request attempt", () => {
      it("Throws an error", async () => {
        mockFetch = jest
          .spyOn(global, "fetch")
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
          .mockImplementationOnce(() => Promise.reject(new Error("mockError")));

        await expect(
          sendHttpRequest(
            {
              url: "https://mockEndpoint.com",
              method: "GET",
            },
            { maxAttempts: 3, delayInMillis: 10 },
          ),
        ).rejects.toThrow("Unexpected network error - Error: mockError");
        expect(mockFetch).toHaveBeenCalledTimes(3);
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

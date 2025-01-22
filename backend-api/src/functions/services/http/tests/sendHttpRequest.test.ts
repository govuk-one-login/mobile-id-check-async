import { Result } from "../../../utils/result";
import {
  HttpError,
  sendHttpRequest,
  SuccessfulHttpResponse,
} from "../sendHttpRequest";

describe("Send HTTP request", () => {
  const MOCK_JITTER_MULTIPLIER = 0.5;
  const httpRequest = {
    url: "https://mockEndpoint.com",
    method: "GET",
  } as const;
  const retryConfig = {
    maxAttempts: 3,
    delayInMillis: 10,
    retryableStatusCodes: [503],
  };

  let mockFetch: jest.SpyInstance;
  let mockSetTimeout: jest.SpyInstance;
  let response: Result<SuccessfulHttpResponse, HttpError>;

  beforeEach(() => {
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
    beforeEach(async () => {
      mockFetch = jest
        .spyOn(global, "fetch")
        .mockImplementation(() => Promise.reject(new Error("mockError")));

      response = await sendHttpRequest(httpRequest, retryConfig);
    });

    it("Returns error result with details from final response", async () => {
      expect(response).toEqual({
        isError: true,
        value: {
          description: "Unexpected network error - Error: mockError",
        },
      });
    });
  });

  describe("Given the request fails with a non retryable statusCode", () => {
    describe.each([[100], [199], [300], [400], [501]])(
      "Given the status code is (%d)",
      (statusCode: number) => {
        beforeEach(async () => {
          mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
            Promise.resolve({
              status: statusCode,
              text: () => Promise.resolve("mockError"),
            } as Response),
          );
          response = await sendHttpRequest(httpRequest, retryConfig);
        });

        it("Does not retry the request", () => {
          expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it("Returns a failure with status code and body", async () => {
          expect(response).toEqual({
            isError: true,
            value: {
              statusCode: statusCode,
              description: "mockError",
            },
          });
        });
      },
    );
  });

  describe("Given the request fails with a retryable statusCode", () => {
    beforeEach(async () => {
      mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 503,
          ok: false,
          text: () => Promise.resolve("mockErrorInformation"),
        } as Response),
      );

      response = await sendHttpRequest(httpRequest, retryConfig);
    });

    it("Attempts to make 3 requests in total", () => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("Returns error result with details from final response", async () => {
      expect(response).toEqual({
        isError: true,
        value: {
          statusCode: 503,
          description: "mockErrorInformation",
        },
      });
    });
  });

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

    it("Returns success result with details from final response", () => {
      expect(response).toEqual({
        isError: false,
        value: {
          body: '{"mock":"responseBody"}',
          headers: { header: "mockHeader" },
          statusCode: 200,
        },
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

    it("Returns a success result with details from final response", () => {
      expect(response).toEqual({
        isError: false,
        value: {
          body: '{"mock":"responseBody"}',
          headers: { header: "mockHeader" },
          statusCode: 200,
        },
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

    it("Returns an error result with details from the final response", () => {
      expect(response).toEqual({
        isError: true,
        value: {
          description: "Unexpected network error - Error: mockError",
        },
      });
    });
  });

  describe("Given a custom maxAttempts value is used - 4 maxAttempts", () => {
    beforeEach(async () => {
      mockFetch = jest
        .spyOn(global, "fetch")
        .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
        .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
        .mockImplementationOnce(() => Promise.reject(new Error("mockError")))
        .mockImplementationOnce(() => Promise.reject(new Error("mockError")));

      response = await sendHttpRequest(httpRequest, {
        maxAttempts: 4,
        delayInMillis: 10,
      });
    });

    it("Attempts to send the request a fourth time", () => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
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
      expect(mockSetTimeout).toHaveBeenNthCalledWith(
        3,
        expect.any(Function),
        40 * MOCK_JITTER_MULTIPLIER,
      );
    });

    it("Returns an error result with details from the final response", () => {
      expect(response).toEqual({
        isError: true,
        value: {
          description: "Unexpected network error - Error: mockError",
        },
      });
    });
  });
});

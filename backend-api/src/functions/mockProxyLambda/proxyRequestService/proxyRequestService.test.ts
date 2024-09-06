import { ProxyRequestService, validateStatus } from "./proxyRequestService";
import axios, { AxiosResponse } from "axios";

const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock("axios");
describe("Proxy Request Service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  describe("Given the network request is not successful", () => {
    it("Returns an error result", async () => {
      mockedAxios.post.mockRejectedValueOnce({});

      const proxyRequestService = new ProxyRequestService();
      const proxyRequestServiceResult =
        await proxyRequestService.makeProxyRequest({
          backendApiUrl: "https://mockUrl.com",
          body: "",
          headers: {},
          method: "POST",
          path: "/async/token",
        });
      expect(proxyRequestServiceResult.isError).toBe(true);
      expect(proxyRequestServiceResult.value).toStrictEqual({
        errorMessage: "Error sending network request",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the network request is successful", () => {
    it("Returns a success result", async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: "mockBody",
        status: 210,
        statusText: "statusText",
        headers: { mockHeaderKey: "mockHeaderValue" },
      };
      mockedAxios.post.mockResolvedValueOnce(axiosResponse);
      const proxyRequestService = new ProxyRequestService();
      const proxyRequestServiceResult =
        await proxyRequestService.makeProxyRequest({
          backendApiUrl: "https://mockUrl.com",
          body: "mockBody",
          headers: { mockHeader: "mockHeaderValue" },
          method: "POST",
          path: "/async/token",
        });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://mockUrl.com/async/token",
        "mockBody",
        { headers: { mockHeader: "mockHeaderValue" }, validateStatus },
      );
      expect(proxyRequestServiceResult.isError).toBe(false);
      expect(proxyRequestServiceResult.value).toStrictEqual({
        statusCode: 210,
        body: "mockBody",
        headers: { mockHeaderKey: "mockHeaderValue" },
      });
    });
  });
});

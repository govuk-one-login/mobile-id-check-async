import axios from "axios";
import { aws4Interceptor } from "aws4-axios";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

import "dotenv/config";

const apiBaseUrl = process.env.PROXY_API_URL;
if (!apiBaseUrl) throw Error("PROXY_URL environment variable not set");
const axiosInstance = axios.create({
  validateStatus: (status: number) => {
    return status < 600;
  },
});
const interceptor = aws4Interceptor({
  options: {
    region: "eu-west-2",
    service: "execute-api",
  },
  credentials: {
    getCredentials: fromNodeProviderChain({
      timeout: 1000,
      maxRetries: 1,
      profile: process.env.AWS_PROFILE,
    }),
  },
});

axiosInstance.interceptors.request.use(interceptor);

describe("POST /token", () => {
  describe("Given there is no grant type", () => {
    it("Returns a 400 Bad Request response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/token`, //execute-url can be found from the Stage section of the APIgw
        {},
      );

      expect(response.data).toStrictEqual({
        error: "invalid_grant",
        error_description: "Invalid grant type or grant type not specified",
      });
      expect(response.status).toBe(400);
    });
  });
});

describe("POST /credential", () => {
  describe("Given there is no authorization header", () => {
    it("Returns a 401 Unauthorized response", async () => {
      const response = await axiosInstance.post(
        `${apiBaseUrl}/async/credential`, //execute-url can be found from the Stage section of the APIgw
        null,
      );

      expect(response.data).toStrictEqual({
        error: "Unauthorized",
        error_description: "Invalid token",
      });
      expect(response.status).toBe(401);
    });
  });
});
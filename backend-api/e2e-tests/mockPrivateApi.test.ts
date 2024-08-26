import axios from "axios";
import { aws4Interceptor } from "aws4-axios";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

const axiosInstance = axios.create({
  validateStatus: (status: number) => {
    return status < 500;
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
      maxRetries: 0,
      profile: process.env.AWS_PROFILE,
    }),
  },
});

axiosInstance.interceptors.request.use(interceptor);

describe("POST /token", () => {
  describe("Given there is no grant type", () => {
    it("Returns a 401 Unauthorized response", async () => {
      const response = await axiosInstance.post(
        "https://apigw-execute-url/dev/async/token", //execute-url can be found from the Stage section of the APIgw
        {},
      );

      expect(response.data).toStrictEqual({
        error: "invalid_grant",
        error_description: "Invalid grant type or grant type not specified",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("Given the client credentials are valid", () => {
    it("Returns an access token", async () => {
      const response = await axiosInstance.post(
        "https://apigw-execute-url/dev/async/token", //execute-url can be found from the Stage section of the APIgw
        { grant_type: "client_credentials" },
        {
          headers: {
            authorization: "Bearer <validClientSecret>", //client secrets are stored in Secrets Manager
          },
        },
      );
      expect(response.data).toMatchObject({
        access_token: expect.any(String),
        token_type: "Bearer",
        expires_in: 3600,
      });
      expect(response.status).toBe(400);
    });
  });
});

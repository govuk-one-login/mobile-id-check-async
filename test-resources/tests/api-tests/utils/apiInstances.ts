import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import aws4Interceptor from "aws4-axios";
import axios from "axios";
import axiosRetry from "axios-retry";
import dotenv from "dotenv";
dotenv.config();

export const STS_MOCK_API_INSTANCE = getStsMockInstance();
export const SESSIONS_API_INSTANCE = getSessionsApiInstance();
export const PROXY_API_INSTANCE = getProxyApiInstance();
export const TEST_RESOURCES_API_INSTANCE = getTestResourcesApiInstance();

function getStsMockInstance() {
  const apiUrl = process.env.STS_MOCK_API_URL;
  if (!apiUrl)
    throw new Error("STS_MOCK_API_URL needs to be defined for API tests");
  return getInstance(apiUrl);
}

function getSessionsApiInstance() {
  const apiUrl = process.env.SESSIONS_API_URL;
  if (!apiUrl)
    throw new Error("SESSIONS_API_URL needs to be defined for API tests");
  return getInstance(apiUrl);
}

function getProxyApiInstance() {
  const apiUrl = process.env.PROXY_API_URL;
  if (!apiUrl)
    throw new Error("PROXY_API_URL needs to be defined for API tests");
  return getInstance(apiUrl, true);
}

function getTestResourcesApiInstance() {
  const apiUrl = process.env.TEST_RESOURCES_API_URL;
  if (!apiUrl)
    throw new Error("TEST_RESOURCES_API_URL needs to be defined for API tests");
  return getInstance(apiUrl, true);
}

function getInstance(baseUrl: string, useAwsSigv4Signing: boolean = false) {
  const apiInstance = axios.create({ baseURL: baseUrl });
  axiosRetry(apiInstance, {
    retries: 2,
    retryDelay: (retryCount) => retryCount * 200,
  });
  apiInstance.defaults.validateStatus = () => true;

  if (useAwsSigv4Signing) {
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
    apiInstance.interceptors.request.use(interceptor);
  }

  return apiInstance;
}

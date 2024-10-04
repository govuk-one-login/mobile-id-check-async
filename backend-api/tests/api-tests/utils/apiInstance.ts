import axios from "axios";
import axiosRetry from "axios-retry";
import "dotenv/config";
import { aws4Interceptor } from "aws4-axios";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

function getInstance(baseUrl: string) {
  const apiInstance = axios.create({ baseURL: baseUrl });
  axiosRetry(apiInstance, {
    retries: 2,
    retryDelay: (retryCount) => retryCount * 200,
  });
  apiInstance.defaults.validateStatus = () => true;
  axiosRetry(apiInstance, {
    retries: 2,
    retryDelay: (retryCount) => retryCount * 200,
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

  apiInstance.interceptors.request.use(interceptor);

  return apiInstance;
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
  return getInstance(apiUrl);
}

function getPrivateApiInstance() {
  const apiUrl = process.env.PRIVATE_API_URL;
  if (!apiUrl)
    throw new Error("PRIVATE_API_URL needs to be defined for API tests");
  return getInstance(apiUrl);
}

export const SESSIONS_API_INSTANCE = getSessionsApiInstance();
export const PROXY_API_INSTANCE = getProxyApiInstance();
export const PRIVATE_API_INSTANCE = getPrivateApiInstance();

import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import "dotenv/config";
import { aws4Interceptor } from "aws4-axios";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

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

function getPrivateApiInstance() {
  const apiUrl = process.env.PRIVATE_API_URL;
  if (!apiUrl)
    throw new Error("PRIVATE_API_URL needs to be defined for API tests");
  return getInstance(apiUrl);
}

function getStsMockInstance() {
  const apiUrl = process.env.STS_MOCK_API_URL;
  if (!apiUrl)
    throw new Error("STS_MOCK_API_URL needs to be defined for API tests");
  return getInstance(apiUrl);
}

function getEventsApiInstance() {
  const apiUrl = process.env.EVENTS_API_URL;
  if (!apiUrl)
    throw new Error("EVENTS_API_URL needs to be defined for API tests");
  return getInstance(apiUrl, true);
}

export const SESSIONS_API_INSTANCE = getSessionsApiInstance();
export const PROXY_API_INSTANCE = getProxyApiInstance();
export const PRIVATE_API_INSTANCE = getPrivateApiInstance();
export const STS_MOCK_API_INSTANCE = getStsMockInstance();
export const EVENTS_API_INSTANCE = getEventsApiInstance();

const getApisToTest = (): {
  apiName: string;
  axiosInstance: AxiosInstance;
  authorizationHeader: string;
}[] => {
  const proxyApiConfig = {
    apiName: "Proxy API",
    axiosInstance: PROXY_API_INSTANCE,
    authorizationHeader: "x-custom-auth",
  };
  const privateApiConfig = {
    apiName: "Private API",
    axiosInstance: PRIVATE_API_INSTANCE,
    authorizationHeader: "Authorization",
  };

  if (process.env.IS_LOCAL_TEST === "true") {
    return [proxyApiConfig]; // test only proxy API locally
  } else {
    return [proxyApiConfig, privateApiConfig]; // test both proxy and private APIs in the pipeline
  }
};

export const APIS = getApisToTest();

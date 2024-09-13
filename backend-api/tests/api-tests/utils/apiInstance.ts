import axios from "axios";
import axiosRetry from "axios-retry";
import "dotenv/config";

function getInstance(baseUrl: string) {
  const apiInstance = axios.create({ baseURL: baseUrl });
  axiosRetry(apiInstance, {
    retries: 2,
    retryDelay: (retryCount) => retryCount * 200,
  });
  apiInstance.defaults.validateStatus = () => true;

  return apiInstance;
}

function getAsyncBackendPublicApiInstance() {
  const publicApiUrl = process.env.PUBLIC_API_URL;
  if (!publicApiUrl)
    throw new Error("PUBLIC_API_URL needs to be defined for API tests");
  return getInstance(publicApiUrl);
}

export const PUBLIC_API_INSTANCE = getAsyncBackendPublicApiInstance();

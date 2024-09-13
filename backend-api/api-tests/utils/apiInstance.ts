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
  const publicApiInstance = process.env.SELF_PUBLIC;
  if (!publicApiInstance)
    throw new Error("SELF_PUBLIC needs to be defined for API tests");
  return getInstance(publicApiInstance);
}

export const PUBLIC_API_INSTANCE = getAsyncBackendPublicApiInstance();

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

function getSessionsApiInstance() {
  const sessionsApiUrl = process.env.SESSIONS_API_URL;
  if (!sessionsApiUrl)
    throw new Error("SESSIONS_API_URL needs to be defined for API tests");
  return getInstance(sessionsApiUrl);
}

export const SESSIONS_API_INSTANCE = getSessionsApiInstance();

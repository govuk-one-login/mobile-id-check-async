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

function getStsMockApiInstance() {
  const stsMockApiUrl = process.env.STS_MOCK_API_URL;
  if (!stsMockApiUrl)
    throw new Error("STS_MOCK_API_URL needs to be defined for API tests");
  console.log(stsMockApiUrl);
  return getInstance(stsMockApiUrl);
}

export const STS_MOCK_API_INSTANCE = getStsMockApiInstance();

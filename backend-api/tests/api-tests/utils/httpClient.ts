import "dotenv/config";

const MAX_ATTEMPTS = 3;
const INITIAL_DELAY_MILLIS = 200;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  data: any;
};

type RequestOptions = {
  baseUrl: string;
  path: string;
  method: "GET";
  headers?: Record<string, string>;
};

const sendRequest = async (options: RequestOptions): Promise<HttpResponse> => {
  const url = `${options.baseUrl}${options.path}`;
  const { method } = options;
  const headers: Record<string, string> = { ...options.headers };

  let attempt = 0;

  const request = async (): Promise<HttpResponse> => {
    attempt++;

    const response = await fetch(url, { method, headers });

    if (
      RETRYABLE_STATUS_CODES.includes(response.status) &&
      attempt < MAX_ATTEMPTS
    ) {
      await wait(Math.pow(2, attempt - 1) * INITIAL_DELAY_MILLIS);
      return request();
    }

    const responseHeaders = Object.fromEntries(response.headers.entries());
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: response.status,
      headers: responseHeaders,
      data,
    };
  };

  return request();
};

const wait = async (delayMillis: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
};

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} needs to be defined for API tests`);
  return value;
};

const SESSIONS_API_URL = getRequiredEnvVar("SESSIONS_API_URL");

type SessionsApiPath = "/.well-known/jwks.json";

type SessionsApiRequest = {
  method: "GET";
  path: SessionsApiPath;
  headers?: Record<string, string>;
};

export const sendSessionsApiRequest = (
  options: SessionsApiRequest,
): Promise<HttpResponse> =>
  sendRequest({ ...options, baseUrl: SESSIONS_API_URL });

import { errorResult, Result, successResult } from "../../utils/result";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MILLIS = 100;

export const sendHttpRequest: ISendHttpRequest = async (
  httpRequest,
  retryConfig,
) => {
  const { url, method, headers, body } = httpRequest;

  let attempt = 0;
  async function request(): Promise<Result<Response>> {
    attempt++;

    const maxAttempts = retryConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const baseDelayMillis =
      retryConfig?.baseDelayMillis ?? DEFAULT_BASE_DELAY_MILLIS;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
      });

      if (!response.ok && attempt < maxAttempts) {
        return retry(request, baseDelayMillis);
      }

      if (!response.ok) {
        return errorResult({
          errorMessage: "Error retrieving STS public keys",
          errorCategory: "SERVER_ERROR",
        });
      }
    } catch {
      if (attempt < maxAttempts) {
        return retry(request, baseDelayMillis);
      }

      return errorResult({
        errorMessage: "Unexpected error retrieving STS public keys",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(response);
  }

  return await request();
};

async function retry(
  request: () => Promise<Result<Response>>,
  baseDelayMillis: number,
) {
  await wait(baseDelayMillis);
  return await request();
}

async function wait(delayMillis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
}

export type RetryConfig = {
  maxAttempts?: number;
  baseDelayMillis?: number;
};

export type HttpMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH";

export type HttpHeaders = {
  [key: string]: string;
};

export type HttpRequest = {
  url: string;
  method: HttpMethod;
  body?: string;
  headers?: HttpHeaders;
};

export type ISendHttpRequest = (
  httpRequest: HttpRequest,
  retryConfig?: RetryConfig,
) => Promise<Result<Response>>;

import { errorResult, Result, successResult } from "../../utils/result";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DELAY_IN_MILLIS = 100;
const DEFAULT_RETRYABLE_STATUS_CODES = [408, 500, 502, 503, 504];

export const sendHttpRequest: ISendHttpRequest = async (
  httpRequest,
  retryConfig,
) => {
  const { url, method, headers, body } = httpRequest;

  let attempt = 0;
  async function request(): Promise<Result<SuccessfulHttpResponse, HttpError>> {
    attempt++;

    const maxAttempts = retryConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const delayInMillis = retryConfig?.delayInMillis ?? DEFAULT_DELAY_IN_MILLIS;
    const retryableStatusCodes =
      retryConfig?.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
      });

      if (
        retryableStatusCodes.includes(response.status) &&
        attempt < maxAttempts
      ) {
        return retryWithExponentialBackoffAndFullJitter(
          request,
          attempt,
          delayInMillis,
        );
      }

      if (!response.ok) {
        return errorResult({
          statusCode: response.status,
          description: await response.text(),
        });
      }
    } catch (error) {
      if (attempt < maxAttempts) {
        return retryWithExponentialBackoffAndFullJitter(
          request,
          attempt,
          delayInMillis,
        );
      }
      return errorResult({
        description: `Unexpected network error - ${error}`,
      });
    }

    return successResult({
      statusCode: response.status,
      body: await response.text(),
      headers: Object.fromEntries(response.headers.entries()),
    });
  }

  return await request();
};

async function retryWithExponentialBackoffAndFullJitter(
  request: () => Promise<Result<SuccessfulHttpResponse, HttpError>>,
  attempt: number,
  baseDelayMillis: number,
) {
  const exponentialDelayWithoutJitter =
    Math.pow(2, attempt - 1) * baseDelayMillis;
  const exponentialDelayWithFullJitter = Math.floor(
    Math.random() * exponentialDelayWithoutJitter,
  );
  await wait(exponentialDelayWithFullJitter);
  return await request();
}

async function wait(delayMillis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
}

export type RetryConfig = {
  maxAttempts?: number;
  delayInMillis?: number;
  retryableStatusCodes?: number[];
};

export type HttpMethod = "GET" | "POST";

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
) => Promise<Result<SuccessfulHttpResponse, HttpError>>;

export type SuccessfulHttpResponse = {
  statusCode: number;
  body?: string;
  headers: HttpHeaders;
};

export type HttpError = {
  statusCode?: number;
  description: string;
};

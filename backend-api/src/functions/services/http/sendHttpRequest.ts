const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DELAY_IN_MILLIS = 100;

export const sendHttpRequest: ISendHttpRequest = async (
  httpRequest,
  retryConfig,
) => {
  const { url, method, headers, body } = httpRequest;

  let attempt = 0;
  async function request(): Promise<SuccessfulHttpResponse> {
    attempt++;

    const maxAttempts = retryConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const delayInMillis = retryConfig?.delayInMillis ?? DEFAULT_DELAY_IN_MILLIS;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
      });
    } catch (error) {
      if (attempt < maxAttempts) {
        return retry(request, delayInMillis);
      }
      throw new Error(`Unexpected network error - ${error}`);
    }

    if (!response.ok && attempt < maxAttempts) {
      return retry(request, delayInMillis);
    }

    if (!response.ok) {
      throw new Error(`Error making http request - ${await response.text()}`);
    }

    return {
      statusCode: response.status,
      body: await response.text(),
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  return await request();
};

async function retry(
  request: () => Promise<SuccessfulHttpResponse>,
  delayInMillis: number,
) {
  await wait(delayInMillis);
  return await request();
}

async function wait(delayMillis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
}

export type RetryConfig = {
  maxAttempts?: number;
  delayInMillis?: number;
};

export type HttpMethod = "GET";

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
) => Promise<SuccessfulHttpResponse>;

export type SuccessfulHttpResponse = {
  statusCode: number;
  body?: string;
  headers: HttpHeaders;
};

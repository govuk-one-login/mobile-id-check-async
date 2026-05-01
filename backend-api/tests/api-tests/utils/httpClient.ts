import "dotenv/config";
import { createHash, createHmac } from "node:crypto";
import { SignatureV4 } from "@smithy/signature-v4";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import type { ChecksumConstructor, SourceData } from "@smithy/types";

class Sha256 {
  private hash;

  constructor(private readonly secret?: SourceData) {
    this.hash = this.createHash();
  }

  update = (data: SourceData): void => {
    this.hash.update(Buffer.from(data as any));
  };

  digest = async (): Promise<Uint8Array> => new Uint8Array(this.hash.digest());

  reset = (): void => {
    this.hash = this.createHash();
  };

  private createHash = () =>
    this.secret
      ? createHmac("sha256", Buffer.from(this.secret as any))
      : createHash("sha256");
}

const sha256Constructor: ChecksumConstructor = Sha256;

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
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
};

const sendRequest = async (options: RequestOptions): Promise<HttpResponse> => {
  const url = `${options.baseUrl}${options.path}`;
  const { method } = options;
  const headers: Record<string, string> = { ...options.headers };

  let body: string | undefined;
  if (options.body !== undefined) {
    if (typeof options.body === "string") {
      body = options.body;
    } else {
      body = JSON.stringify(options.body);
      headers["content-type"] ??= "application/json";
    }
  }

  let attempt = 0;

  const request = async (): Promise<HttpResponse> => {
    attempt++;

    const response = await fetch(url, { method, headers, body });

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

const signRequestOptions = async (
  options: RequestOptions,
): Promise<RequestOptions> => {
  const url = new URL(`${options.baseUrl}${options.path}`);

  const body =
    options.body === undefined
      ? undefined
      : typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

  const signer = new SignatureV4({
    service: "execute-api",
    region: "eu-west-2",
    credentials: fromNodeProviderChain({
      timeout: 1000,
      maxRetries: 1,
      profile: process.env.AWS_PROFILE,
    }),
    sha256: sha256Constructor,
  });

  const signed = await signer.sign({
    method: options.method,
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      host: url.hostname,
      ...options.headers,
    },
    body,
  });

  return {
    ...options,
    headers: signed.headers,
  };
};

const wait = async (delayMillis: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
};

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} needs to be defined for API tests`);
  return value;
};

// Sessions API - no signing required

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

// ReadID Mock API - SigV4 signed

const READ_ID_MOCK_API_URL = getRequiredEnvVar("READ_ID_MOCK_API_URL");

type ReadIdMockApiRequest = {
  method: "POST";
  path: `/setupBiometricSessionByScenario/${string}`;
  body: string;
};

export const sendReadIdMockApiRequest = async (
  options: ReadIdMockApiRequest,
): Promise<HttpResponse> => {
  const signed = await signRequestOptions({
    ...options,
    baseUrl: READ_ID_MOCK_API_URL,
  });
  return sendRequest(signed);
};

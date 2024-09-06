import axios, { AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios";
import { errorResult, Result, successResult } from "../../utils/result";
import { StandardisedHeaders } from "../mockProxyHandler";

export interface RequestOptions {
  backendApiUrl: string;
  body: string | null;
  headers: StandardisedHeaders;
  method: "POST";
  path: string;
}
export interface IMakeProxyRequest {
  makeProxyRequest: (
    requestOptions: RequestOptions,
  ) => Promise<Result<ProxySuccessResult>>;
}

interface ProxySuccessResult {
  statusCode: number;
  body: string;
  headers: StandardisedHeaders;
}

export class ProxyRequestService implements IMakeProxyRequest {
  makeProxyRequest = async (
    requestOptions: RequestOptions,
  ): Promise<Result<ProxySuccessResult>> => {
    try {
      const response = await axios.post(
        `${requestOptions.backendApiUrl}${requestOptions.path}`,
        requestOptions.body,
        {
          headers: requestOptions.headers,
          validateStatus,
        },
      );

      return successResult({
        statusCode: response.status,
        body: response.data,
        headers: standardiseAxiosHeaders(response.headers),
      });
    } catch {
      return errorResult({
        errorCategory: "SERVER_ERROR",
        errorMessage: "Error sending network request",
      });
    }
  };
}

export const validateStatus = (status: number) => {
  return status < 600;
};

const standardiseAxiosHeaders = (
  axiosResponseHeaders: RawAxiosResponseHeaders | AxiosResponseHeaders,
): StandardisedHeaders => {
  const standardisedHeaders: StandardisedHeaders = {};
  const headerKeys = Object.keys(axiosResponseHeaders);
  headerKeys.forEach((headerKey) => {
    const headerValue = axiosResponseHeaders[headerKey];
    if (
      typeof headerValue === "string" ||
      typeof headerValue === "number" ||
      typeof headerValue === "boolean"
    ) {
      standardisedHeaders[headerKey] = headerValue;
    }
  });

  return standardisedHeaders;
};

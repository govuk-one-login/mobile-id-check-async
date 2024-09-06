import axios from "axios";
import { errorResult, Result, successResult } from "../../utils/result";

export interface RequestOptions {
  backendApiUrl: string;
  body: string | null;
  headers: { [key in string]: string | number | boolean | undefined };
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
  headers: { [key in string]: string | number | boolean };
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
      const responseHeaders: { [key in string]: string | number | boolean } =
        {};
      const headerKeys = Object.keys(response.headers);
      headerKeys.forEach((headerKey) => {
        const headerValue = response.headers[headerKey];
        if (
          typeof headerValue === "string" ||
          typeof headerValue === "number" ||
          typeof headerValue === "boolean"
        ) {
          responseHeaders[headerKey] = headerValue;
        }
      });

      return successResult({
        statusCode: response.status,
        body: response.data,
        headers: responseHeaders,
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

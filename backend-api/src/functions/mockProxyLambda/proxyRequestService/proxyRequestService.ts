import { errorResult, Result } from "../../utils/result";

export interface IMakeProxyRequest {
  makeProxyRequest: () => Promise<Result<ProxySuccessResult>>;
}

interface ProxySuccessResult {
  statusCode: number;
  body: string;
  headers: { [key in string]: string };
}

export class ProxyRequestService implements IMakeProxyRequest {
  makeProxyRequest = (): Promise<
    Result<{
      statusCode: number;
      body: string;
      headers: { [key in string]: string };
    }>
  > => {
    return Promise.resolve(
      errorResult({
        errorCategory: "SERVER_ERROR",
        errorMessage: "unexpected error",
      }),
    );
  };
}

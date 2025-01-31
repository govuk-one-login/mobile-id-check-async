export type Result<S> = SuccessResult<S> | ErrorResult;

type SuccessResult<S> = {
  isError: false;
  value: S;
};

type ErrorResult = {
  isError: true;
  value: ErrorResultValue
  // value: {
  //   errorMessage: string;
  //   errorCategory?: ErrorCategory;
  // [key: string]: string | undefined;
  // };
};

type ErrorResultValue = {
  errorMessage: string;
  errorCategory?: ErrorCategory;
  [key: string]: string | undefined;
}

export const successResult = <S>(value: S): SuccessResult<S> => {
  return {
    isError: false,
    value,
  };
};

export const errorResult = (value: ErrorResultValue): ErrorResult => {
  return {
    isError: true,
    value,
  };
};

type ErrorCategory = "SERVER_ERROR" | "CLIENT_ERROR";

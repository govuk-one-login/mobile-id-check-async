export type Result<S> = SuccessResult<S> | ErrorResult;

type SuccessResult<S> = {
  isError: false;
  value: S;
};

type ErrorResult = {
  isError: true;
  value: { errorMessage: string; errorCategory: ErrorCategory };
};

export const successResult = <S>(value: S): SuccessResult<S> => {
  return {
    isError: false,
    value,
  };
};

export const errorResult = (value: {
  errorMessage: string;
  errorCategory: ErrorCategory;
} ): ErrorResult => {
  return {
    isError: true,
    value,
  };
};

type ErrorCategory = "SERVER_ERROR" | "CLIENT_ERROR";

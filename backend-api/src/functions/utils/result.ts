export type Result<S, E = BaseError> = SuccessResult<S> | ErrorResult<E>;

export type SuccessResult<S> = {
  isError: false;
  value: S;
};

export type ErrorResult<E> = {
  isError: true;
  value: E;
};

export const successResult = <S>(value: S): SuccessResult<S> => {
  return {
    isError: false,
    value,
  };
};

export const errorResult = <E>(value: E): ErrorResult<E> => {
  return {
    isError: true,
    value,
  };
};

export enum ErrorCategory {
  SERVER_ERROR = "SERVER_ERROR",
  CLIENT_ERROR = "CLIENT_ERROR",
}

type BaseError = { errorMessage: string; errorCategory?: ErrorCategory };

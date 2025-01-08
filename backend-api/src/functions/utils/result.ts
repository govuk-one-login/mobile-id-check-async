export type Result<S, E = BaseError> = Success<S> | Failure<E>;

export type Success<S> = {
  isError: false;
  value: S;
};

export type Failure<E> = {
  isError: true;
  value: E;
};

export const successResult = <S>(value: S): Success<S> => {
  return {
    isError: false,
    value,
  };
};

export const errorResult = <E>(value: E): Failure<E> => {
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

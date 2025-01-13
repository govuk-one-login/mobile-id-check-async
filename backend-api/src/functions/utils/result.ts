export type Result<T, E = BaseError> = Success<T> | Failure<E>;

export type Success<T> = [T] extends [void]
  ? EmptySuccess
  : SuccessWithValue<T>;
export type Failure<E> = [E] extends [void]
  ? EmptyFailure
  : FailureWithValue<E>;

export type SuccessWithValue<T> = {
  isError: false;
  value: T;
};

export type EmptySuccess = {
  isError: false;
};

export type FailureWithValue<E> = {
  isError: true;
  value: E;
};

export type EmptyFailure = {
  isError: true;
};

export const successResult = <T>(value: T): SuccessWithValue<T> => {
  return {
    isError: false,
    value,
  };
};

export const emptySuccess = (): EmptySuccess => {
  return {
    isError: false,
  };
};

export const errorResult = <E>(value: E): FailureWithValue<E> => {
  return {
    isError: true,
    value,
  };
};

export const emptyFailure = (): EmptyFailure => {
  return {
    isError: true,
  };
};

export enum ErrorCategory {
  SERVER_ERROR = "SERVER_ERROR",
  CLIENT_ERROR = "CLIENT_ERROR",
}

type BaseError = { errorMessage: string; errorCategory?: ErrorCategory };

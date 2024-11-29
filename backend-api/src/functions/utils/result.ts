export type Result<T, E = BaseError> = Success<T> | Failure<E>

export type Success<T> = T extends void ? EmptySuccess : SuccessWithValue<T>

export type EmptySuccess = {
  isError: false
}

export type SuccessWithValue<T> = {
  isError: false
  value: T
}

export type Failure<E> = E extends void
  ? EmptyFailure
  : FailureWithError<E>

export type EmptyFailure = {
  isError: true
}

export type FailureWithError<E> = {
  isError: true
  value: E
}


type BaseError = {
  errorMessage: string;
  errorCategory?: ErrorCategory
}

export function emptySuccess(): EmptySuccess {
  return {
    isError: false,
  }
}

export const successResult = <S>(value: S): SuccessWithValue<S> => {
  return {
    isError: false,
    value,
  };
};

export function emptyFailure(): EmptyFailure {
  return {
    isError: true,
  }
}

export const errorResult = <E>(value: E): FailureWithError<E> => {
  return {
    isError: true,
    value
  };
};

type ErrorCategory = "SERVER_ERROR" | "CLIENT_ERROR";

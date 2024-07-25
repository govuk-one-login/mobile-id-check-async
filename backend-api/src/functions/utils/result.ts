export type Result<S, E = string> = SuccessResult<S> | ErrorResult<E>;

type SuccessResult<S> = {
  isError: false;
  value: S;
};

type ErrorResult<E> = {
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

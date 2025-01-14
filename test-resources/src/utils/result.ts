export type Result<S> = SuccessResult<S> | ErrorResult;

type SuccessResult<S> = {
  isError: false;
  value: S;
};

type ErrorResult = {
  isError: true;
  value: { [key in string]: string };
};

export const successResult = <S>(value: S): SuccessResult<S> => {
  return {
    isError: false,
    value,
  };
};

export const errorResult = (value: {
  [key in string]: string;
}): ErrorResult => {
  return {
    isError: true,
    value,
  };
};


export interface ErrorOrSuccess<TValue> {
  isError: boolean;
  value: string | TValue;
}

export function successResponse<TValue>(value: TValue): ErrorOrSuccess<TValue> {
  return {
    isError: false,
    value,
  };
}

export function errorResponse<TValue>(
  errorMessage: string,
): ErrorOrSuccess<TValue> {
  return {
    isError: true,
    value: errorMessage,
  };
}

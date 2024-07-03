export interface LogOrValue<TValue> {
  isLog: boolean;
  value: string | TValue;
}

export function value<TValue>(value: TValue): LogOrValue<TValue> {
  return {
    isLog: false,
    value,
  };
}

export function log<TValue>(log: string): LogOrValue<TValue> {
  return {
    isLog: true,
    value: log,
  };
}

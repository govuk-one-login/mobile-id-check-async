export interface IJwtPayload {
  [key: string]: string | number | undefined;
  iss: string;
  aud: string;
  scope: string;
  exp: number;
  client_id: string;
  nbf?: number;
  iat?: number;
}

export interface JwtHeader {
  alg: Algorithm | string;
  typ: string;
  kid?: string;
}

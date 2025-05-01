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

export interface CredentialJwtPayload {
  iat: number;
  iss: string;
  jti: string;
  nbf: number;
  sub: string;
  vc: string; // To be updated when using the real package
}

export type JwtPayload = CredentialJwtPayload;

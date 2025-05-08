import { BiometricCredential } from "@govuk-one-login/mobile-id-check-biometric-credential";

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
  vc: BiometricCredential;
}

export type JwtPayload = CredentialJwtPayload;

export type JwtAlg = "ES256";

export interface CredentialJwt {
  iat: number;
  iss: string;
  nbf: number;
  sub: string;
  aud: string;
  exp?: number;
  jti: string;
  vc: string; // To be updated when using the real package
}

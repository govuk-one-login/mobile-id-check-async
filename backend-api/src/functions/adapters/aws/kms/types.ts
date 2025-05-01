export type JwtAlg = "ES256";

export interface CredentialJwt {
  sub: string;
  iat: number;
  iss: string;
  nbf: number;
  jti: string;
  vc: string; // To be updated when using the real package
}

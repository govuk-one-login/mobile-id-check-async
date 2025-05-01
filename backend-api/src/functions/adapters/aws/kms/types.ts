export interface CredentialJwtPayload {
  sub: string;
  iat: number;
  iss: string;
  nbf: number;
  jti: string;
  vc: string; // To be updated when using the real package
}

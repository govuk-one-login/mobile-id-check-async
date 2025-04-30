export interface Jwks {
  keys: (EncryptionJwk | SigningJwk)[];
}

export interface EncryptionJwk extends JsonWebKey {
  alg: EncryptionJwkAlgorithm;
  kid: string;
  use: EncryptionJwkUse;
}

export interface SigningJwk extends JsonWebKey {
  alg: SigningJwkAlgorithm;
  kid: string;
  use: SigningJwkUse;
}

export type EncryptionJwkAlgorithm = "RSA-OAEP-256";
export type EncryptionJwkUse = "enc";

export type SigningJwkAlgorithm = "ES256";
export type SigningJwkUse = "sig";

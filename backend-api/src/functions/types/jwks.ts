export interface Jwks {
  keys: EncryptionJwk[];
}
export interface EncryptionJwk extends JsonWebKey {
  alg: EncryptionJwkAlgorithm;
  kid: string;
  use: EncryptionJwkUse;
}

export type EncryptionJwkAlgorithm = "RSA-OAEP-256";
export type EncryptionJwkUse = "enc";

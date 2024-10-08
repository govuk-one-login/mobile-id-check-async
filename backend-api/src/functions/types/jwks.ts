export interface Jwks {
  keys: EncryptionJwk[];
}
export interface EncryptionJwk extends JsonWebKey {
  alg: EncryptionJwkAlgorithm;
  kid: string;
  use: EncryptionJwkUse;
}

export type EncryptionJwkAlgorithm = "RS256";
export type EncryptionJwkUse = "enc";

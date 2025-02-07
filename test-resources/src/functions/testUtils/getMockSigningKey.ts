import { SigningKey } from "../test-resources/token/keyRetriever/keyRetriever";
import { createPrivateKey } from "node:crypto";

export function getMockSigningKey(): SigningKey {
  const jwk = {
    kty: "EC",
    x: "X5Sk_TNlp2cZ_mUQ7p_Gqth7IVkLGaMFfUH-e6pzUC8",
    y: "Iw5VG-5Sb-c954Xqanov47QhQVLEw3H9BdGNwR9RvOw",
    crv: "P-256",
    d: "eswmWYW980vOl7x0MZBqzAkxN215eogA0fFJCu6umfw",
    kid: "iyVpkshZ0QKq5ORWz7mc76x0dAKUp4RS113tiHACjpQ",
  };
  const signingKey = createPrivateKey({ key: jwk, format: "jwk" });
  const keyId = jwk.kid;
  return { signingKey, keyId };
}

import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("GET /.well-known/jwks.json", () => {
  let jwksResponse: any;

  beforeAll(async () => {
    jwksResponse = await SESSIONS_API_INSTANCE.get("/.well-known/jwks.json");
  });

  it("returns 200 status code and the Json Web Key Set", () => {
    expect(jwksResponse.status).toBe(200);
    expect(jwksResponse.data.keys.length).toBeGreaterThanOrEqual(2);
  });

  it("should return both signing and encryption keys with correct properties", () => {
    const allJwksKeys = jwksResponse.data.keys;

    allJwksKeys.forEach((key: JsonWebKey) => {
      expect(key).toHaveProperty("kty");
      expect(key).toHaveProperty("use");
      expect(key).toHaveProperty("alg");
      expect(key).toHaveProperty("kid");
    });

    const signingKeys = allJwksKeys.filter(
      (key: JsonWebKey) => key.use === "sig",
    );
    const encryptionKeys = allJwksKeys.filter(
      (key: JsonWebKey) => key.use === "enc",
    );

    expect(signingKeys.length).toBeGreaterThan(0);
    expect(encryptionKeys.length).toBeGreaterThan(0);

    signingKeys.forEach((key: JsonWebKey) => {
      expect(key.kty).toBe("EC");
      expect(key.alg).toBe("ES256");
      expect(key.use).toBe("sig");
      expect(key.x).toBeDefined();
      expect(key.y).toBeDefined();
      expect(key.crv).toBe("P-256");
    });

    encryptionKeys.forEach((key: JsonWebKey) => {
      expect(key.kty).toBe("RSA");
      expect(key.alg).toBe("RSA-OAEP-256");
      expect(key.use).toBe("enc");
      expect(key.n).toBeDefined();
      expect(key.e).toBeDefined();
    });
  });
});

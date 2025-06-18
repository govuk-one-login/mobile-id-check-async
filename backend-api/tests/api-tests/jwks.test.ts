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

  it("should include a Cache-Control header with `max-age=300`", () => {
    expect(jwksResponse.headers).toHaveProperty("cache-control");

    const cacheControl = jwksResponse.headers["cache-control"];

    expect(cacheControl).toMatch(/max-age=/);

    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAgeValue = parseInt(maxAgeMatch[1], 10);

    expect(maxAgeValue).toBeGreaterThan(0);
    expect(maxAgeValue).toBe(300);
  });
});

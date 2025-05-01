import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("GET /.well-known/jwks.json", () => {
  it("returns 200 status code and the Json Web Key Set", async () => {
    const response = await SESSIONS_API_INSTANCE.get("/.well-known/jwks.json");
    expect(response.status).toBe(200);
    expect(response.data.keys.length).toBeGreaterThanOrEqual(2);

    response.data.keys.forEach((key: JsonWebKey) => {
      expect(key).toHaveProperty("kty");
      expect(key).toHaveProperty("use");
      expect(key).toHaveProperty("alg");
      expect(key).toHaveProperty("kid");

      if (key.kty === "RSA") {
        expect(key).toHaveProperty("n");
        expect(key).toHaveProperty("e");
      } else if (key.kty === "EC") {
        expect(key).toHaveProperty("x");
        expect(key).toHaveProperty("y");
        expect(key).toHaveProperty("crv");
        expect(key.crv).toBe("P-256"); // ECC_NIST_P256
      }
    });
  });
});

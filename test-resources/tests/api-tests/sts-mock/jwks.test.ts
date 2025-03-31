import { STS_MOCK_API_INSTANCE } from "../../testUtils/apiTestHelpers";

describe("GET /.well-known/jwks.json", () => {
  it("returns 200 status code and the Json Web Key Set", async () => {
    const response = await STS_MOCK_API_INSTANCE.get("/.well-known/jwks.json");

    expect(response.status).toStrictEqual(200);
    expect(response.data.keys.length).toBeGreaterThanOrEqual(1);
    response.data.keys.forEach((key: JsonWebKey) => {
      expect(key).toHaveProperty("alg", "ES256");
      expect(key).toHaveProperty("crv", "P-256");
      expect(key).toHaveProperty("kid");
      expect(key).toHaveProperty("kty", "EC");
      expect(key).toHaveProperty("use", "sig");
      expect(key).toHaveProperty("x");
      expect(key).toHaveProperty("y");
    });
  });
});

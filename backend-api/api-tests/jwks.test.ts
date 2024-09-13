import { PUBLIC_API_INSTANCE } from "./utils/apiInstance";

describe("GET /.well-known/jwks.json", () => {
  it("returns 200 status code and the Json Web Key Set", async () => {
    const response = await PUBLIC_API_INSTANCE.get("/.well-known/jwks.json");
    expect(response.status).toBe(200);
    expect(response.data.keys.length).toBeGreaterThanOrEqual(1);
    response.data.keys.forEach((key: JsonWebKey) => {
      expect(key).toHaveProperty("kty");
      expect(key).toHaveProperty("n");
      expect(key).toHaveProperty("e");
      expect(key).toHaveProperty("alg");
      expect(key).toHaveProperty("kid");
    });
  });
});

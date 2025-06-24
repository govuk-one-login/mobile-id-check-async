import { InMemoryJwksCache } from "../JwksCache";

describe("getSingletonInstance", () => {
  it("Returns same instance on repeated calls", () => {
    const first = InMemoryJwksCache.getSingletonInstance();
    const second = InMemoryJwksCache.getSingletonInstance();
    expect(first).toBe(second);
  });
});

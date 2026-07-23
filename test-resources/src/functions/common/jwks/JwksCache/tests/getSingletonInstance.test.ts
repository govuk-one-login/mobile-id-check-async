import { InMemoryJwksCache } from "../JwksCache";
import { expect, it, describe } from "vitest";

describe("InMemoryJwksCache - getSingletonInstance", () => {
  it("Returns same instance on repeated calls", () => {
    const first = InMemoryJwksCache.getSingletonInstance();
    const second = InMemoryJwksCache.getSingletonInstance();
    expect(first).toBe(second);
  });
});

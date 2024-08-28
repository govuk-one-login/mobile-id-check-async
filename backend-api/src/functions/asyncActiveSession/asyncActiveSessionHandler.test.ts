import { lambdaHandler } from "./asyncActiveSessionHandler"

describe("Async Active Session", () => {
  describe("Given a request is made", () => {
    it("Returns 200 Hello, World response", async () => {
      const result = await lambdaHandler()

      expect(result).toStrictEqual({
        statusCode: 200,
        body: "Hello, World"
      })
    })
  })
})
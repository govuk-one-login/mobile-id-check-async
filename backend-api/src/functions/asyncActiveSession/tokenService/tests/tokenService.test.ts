import { TokenService } from "../tokenService"


describe("Token Service", () => {
  describe("Get Sub From Token", () => {
    describe("Retrieving STS public key", () => {
      describe("Given an unexpected error retrieving the public key", () => {
        it("Returns error result", () => {
          const tokenService = new TokenService()

          const result = tokenService.getSubFromToken()

          expect(result.isError).toBe(true)
          expect(result.value).toStrictEqual({
            errorMessage: "Unexpected error retrieving STS public key",
            errorCategory: "SERVER_ERROR",
          })
        })
      })
    })

    // describe("Token decryption", () => {

    // })
  })
})

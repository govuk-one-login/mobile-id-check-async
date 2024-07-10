import { IDecodedClientCredentials } from "../../types/clientCredentials";
import {
  ClientCredentialsService,
  IRegisteredClientCredentials,
} from "./clientCredentialsService";

describe("Client Credentials Service", () => {
  let clientCredentialsService: ClientCredentialsService;
  let mockSuppliedClientCredentials: IDecodedClientCredentials;
  let mockStoredClientCredentialsArray: IRegisteredClientCredentials[];
  let mockStoredClientCredentials: IRegisteredClientCredentials;

  beforeEach(() => {
    clientCredentialsService = new ClientCredentialsService();
    mockSuppliedClientCredentials = {
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
    };
    mockStoredClientCredentialsArray = [
      {
        client_id: "mockClientId",
        issuer: "mockIssuer",
        salt: "0vjPs=djeEHP",
        hashed_client_secret:
          "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
        redirect_uri: "https://mockRedirectUri.com",
      },
      {
        client_id: "mockAnotherClientId",
        issuer: "mockIssuer",
        salt: "0vjPs=djeEHP",
        hashed_client_secret:
          "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
        redirect_uri: "https://mockRedirectUri.com",
      },
    ];
    mockStoredClientCredentials = {
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "0vjPs=djeEHP",
      hashed_client_secret:
        "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
      redirect_uri: "https://mockRedirectUri.com",
    };
  });

  describe("Validate", () => {
    describe("Given the supplied hashed client secret does not match the stored hashed client secret", () => {
      it("Returns false", async () => {
        mockSuppliedClientCredentials = {
          clientId: "mockClientId",
          clientSecret: "mockInvalidClientSecret",
        };

        const result = clientCredentialsService.validate(
          mockStoredClientCredentials,
          mockSuppliedClientCredentials,
        );

        expect(result.isError).toBe(true);
        expect(result.value).toBe(
          "Client secret not valid for the supplied clientId",
        );
      });
    });

    describe("redirect_uri validation", () => {
      describe("Given redirect_uri is not present", () => {
        it("Returns a log", () => {
          mockStoredClientCredentials.redirect_uri = "";

          const result = clientCredentialsService.validate(
            mockStoredClientCredentials,
            mockSuppliedClientCredentials,
          );

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Missing redirect_uri");
        });
      });

      describe("Given redirect_uri is not a valid URL", () => {
        it("Returns a log", () => {
          mockStoredClientCredentials.redirect_uri = "mockInvalidURL";

          const result = clientCredentialsService.validate(
            mockStoredClientCredentials,
            mockSuppliedClientCredentials,
          );

          expect(result.isError).toBe(true);
          expect(result.value).toBe("Invalid redirect_uri");
        });
      });
    });

    describe("Given the supplied credentials match the stored credentials", () => {
      it("Returns true", async () => {
        mockSuppliedClientCredentials = {
          clientId: "mockAnotherClientId",
          clientSecret: "mockClientSecret",
        };

        const result = clientCredentialsService.validate(
          mockStoredClientCredentials,
          mockSuppliedClientCredentials,
        );

        expect(result.isError).toBe(false);
        expect(result.value).toBe(null);
      });
    });
  });

  describe("Get client credentials by ID", () => {
    describe("Given the supplied credential clientId is not present in the stored credentials array", () => {
      it("Returns an error response", async () => {
        mockSuppliedClientCredentials = {
          clientId: "mockInvalidClientId",
          clientSecret: "mockClientSecret",
        };

        const result = clientCredentialsService.getClientCredentialsById(
          mockStoredClientCredentialsArray,
          mockSuppliedClientCredentials.clientId,
        );

        expect(result.isError).toBe(true);
        expect(result.value).toBe("ClientId not registered");
      });
    });

    describe("Given the supplied credential clientId is present in the stored credentials array", () => {
      it("Returns client credentials", async () => {
        mockSuppliedClientCredentials = {
          clientId: "mockClientId",
          clientSecret: "mockClientSecret",
        };
        const expectedClientCredentials = {
          client_id: "mockClientId",
          issuer: "mockIssuer",
          salt: "0vjPs=djeEHP",
          hashed_client_secret:
            "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
          redirect_uri: "https://mockRedirectUri.com",
        };

        const result = clientCredentialsService.getClientCredentialsById(
          mockStoredClientCredentialsArray,
          mockSuppliedClientCredentials.clientId,
        );
        expect(result.isError).toBe(false);
        expect(result.value).toEqual(expectedClientCredentials);
      });
    });
  });
});

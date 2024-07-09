import { IDecodedClientCredentials } from "../../types/clientCredentials";
import {
  ClientCredentialsService,
  IClientCredentials,
} from "./clientCredentialsService";

describe("Client Credentials Service", () => {
  let clientCredentialsService: ClientCredentialsService;
  let mockSuppliedClientCredentials: IDecodedClientCredentials;
  let mockStoredClientCredentialsArray: IClientCredentials[];
  let mockStoredClientCredentials: IClientCredentials;

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
      },
      {
        client_id: "mockAnotherClientId",
        issuer: "mockIssuer",
        salt: "0vjPs=djeEHP",
        hashed_client_secret:
          "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
      },
    ];
    mockStoredClientCredentials = {
      client_id: "mockClientId",
      issuer: "mockIssuer",
      salt: "0vjPs=djeEHP",
      hashed_client_secret:
        "964adf477e02f0fd3fac7fdd08655d1e70ba142f02c946e21e1e194f49a05379", // mockClientSecret hashing with above salt
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

        expect(result).toBe(false);
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

        expect(result).toBe(true);
      });
    });
  });

  describe("Get client credentials by ID", () => {
    describe("Given the supplied credential clientId is not present in the stored credentials array", () => {
      it("Returns null", async () => {
        mockSuppliedClientCredentials = {
          clientId: "mockInvalidClientId",
          clientSecret: "mockClientSecret",
        };

        const result = clientCredentialsService.getClientCredentialsById(
          mockStoredClientCredentialsArray,
          mockSuppliedClientCredentials.clientId,
        );

        expect(result).toBe(null);
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
        };

        const result = clientCredentialsService.getClientCredentialsById(
          mockStoredClientCredentialsArray,
          mockSuppliedClientCredentials.clientId,
        );

        expect(result).toEqual(expectedClientCredentials);
      });
    });
  });
});

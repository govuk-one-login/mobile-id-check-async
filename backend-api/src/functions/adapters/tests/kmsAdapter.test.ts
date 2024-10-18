import { AwsStub, mockClient } from "aws-sdk-client-mock";
import {
  DecryptCommand,
  GetPublicKeyCommand,
  IncorrectKeyException,
  InvalidCiphertextException,
  KeyUnavailableException,
  KMSClient,
  KMSClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-kms";
import { ClientError, IKmsAdapter, KMSAdapter } from "../kmsAdapter";

describe("KMS Adapter", () => {
  let mockKmsClient: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    KMSClientResolvedConfig
  >;
  let kmsAdapter: IKmsAdapter;
  beforeEach(() => {
    mockKmsClient = mockClient(KMSClient);
    kmsAdapter = new KMSAdapter();
  });

  describe("Decrypt", () => {
    describe("Given a InvalidCiphertextException error happens trying to decrypt the data", () => {
      it("Throws a ClientError", async () => {
        mockKmsClient.on(DecryptCommand).rejects(
          new InvalidCiphertextException({
            $metadata: {},
            message: "Some error message",
          }),
        );

        await expect(() =>
          kmsAdapter.decrypt(new Uint8Array(), "mockKeyId"),
        ).rejects.toThrowError(ClientError);
      });
    });

    describe("Given a IncorrectKeyException error happens trying to decrypt the data", () => {
      it("Throws a ClientError", async () => {
        mockKmsClient.on(DecryptCommand).rejects(
          new IncorrectKeyException({
            $metadata: {},
            message: "Some error message",
          }),
        );

        await expect(() =>
          kmsAdapter.decrypt(new Uint8Array(), "mockKeyId"),
        ).rejects.toThrowError(ClientError);
      });
    });

    describe("Given any other error happens trying to decrypt the data", () => {
      it("Throws the error thrown by the KMS client", async () => {
        mockKmsClient.on(DecryptCommand).rejects(
          new KeyUnavailableException({
            $metadata: {},
            message: "Some error message",
          }),
        );

        await expect(() =>
          kmsAdapter.decrypt(new Uint8Array(), "mockKeyId"),
        ).rejects.toThrowError(KeyUnavailableException);
      });
    });

    describe("Given the response does not contain the decrypted data (i.e. 'Plaintext' is falsy)", () => {
      it("Throws a new Error", async () => {
        mockKmsClient.on(DecryptCommand).resolves({});

        await expect(() =>
          kmsAdapter.decrypt(new Uint8Array(), "mockKeyId"),
        ).rejects.toThrowError(
          new Error("Decrypted plaintext data is missing from response"),
        );
      });
    });

    describe("Given the data is successfully decrypted", () => {
      it("Returns the decrypted data", async () => {
        mockKmsClient
          .on(DecryptCommand)
          .resolves({ Plaintext: new Uint8Array(10) });

        const response = await kmsAdapter.decrypt(
          new Uint8Array(),
          "mockKeyId",
        );
        expect(response).toEqual(new Uint8Array(10));
      });
    });
  });
  describe("GetPublicKey", () => {
    describe("Given an error happens trying to get the public key", () => {
      it("Throws the error thrown by the KMS client", async () => {
        mockKmsClient.on(GetPublicKeyCommand).rejects(
          new KeyUnavailableException({
            $metadata: {},
            message: "Some error message",
          }),
        );

        await expect(() =>
          kmsAdapter.getPublicKey("mockKeyId"),
        ).rejects.toThrowError(KeyUnavailableException);
      });
    });

    describe("Given the response does not contain the public key", () => {
      it("Throws a new Error", async () => {
        mockKmsClient.on(GetPublicKeyCommand).resolves({});

        await expect(() =>
          kmsAdapter.getPublicKey("mockKeyId"),
        ).rejects.toThrowError(
          new Error("Public key is missing from response"),
        );
      });
    });

    describe("Given the public key is successfully retrieve", () => {
      it("Returns the decrypted data", async () => {
        mockKmsClient
          .on(GetPublicKeyCommand)
          .resolves({ PublicKey: new Uint8Array(10) });

        const response = await kmsAdapter.getPublicKey("mockKeyId");
        expect(response).toEqual(new Uint8Array(10));
      });
    });
  });
});

import {
  GetObjectCommand,
  GetObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { KeyRetriever, SigningKey } from "../keyRetriever";
import { ErrorCategory } from "../../../../common/utils/result";

const mockS3Client = mockClient(S3Client);
const mockS3Response = (content: string) => {
  return {
    transformToString: async () => content,
  };
};

describe("Key Retriever", () => {
  const bucketName = "test-bucket-name";
  const fileName = "test-file-name";

  let keyRetriever: KeyRetriever;

  beforeEach(() => {
    keyRetriever = new KeyRetriever();
  });

  afterEach(() => {
    mockS3Client.reset();
  });

  describe("Given an error happens trying to retrieve the signing key from S3", () => {
    it("Returns an error response", async () => {
      mockS3Client
        .on(GetObjectCommand)
        .rejects(new Error("Failed to get object from S3"));

      const result = await keyRetriever.getKey(bucketName, fileName);

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error getting object from S3",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given the object retrieved from S3 is empty", () => {
    it("Returns an error response", async () => {
      mockS3Client
        .on(GetObjectCommand)
        .resolves({ Body: undefined } as GetObjectCommandOutput);

      const result = await keyRetriever.getKey(bucketName, fileName);

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Empty object retrieved from S3",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given an error happens trying to format the signing key retrieved from S3", () => {
    it("Returns an error response", async () => {
      mockS3Client.on(GetObjectCommand).resolves({
        Body: mockS3Response("notAValidSigningKey"),
      } as GetObjectCommandOutput);

      const result = await keyRetriever.getKey(bucketName, fileName);

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error formatting key",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given the signing key is retrieved from S3 and formatted successfully", () => {
    it("Returns a success response", async () => {
      mockS3Client.on(GetObjectCommand).resolves({
        Body: mockS3Response(
          '{"kty":"EC","x":"Fu8jCR5SKk4U7GgEpwhWcAskSaNijIWatBDTlq9wtLE","y":"JWPbl4IH21CzX-xIT56BcohswoudKGprHNyoA3Q7MnY","crv":"P-256","d":"hrOBzfJwnr-XSY-I4j-aCgNjcDq7_TfOd2W9u7al56Y","kid":"iyVpkshZ0QKq5ORWz7mc76x0dAKUp4RS113tiHACjpQ"}',
        ),
      } as GetObjectCommandOutput);

      const result = await keyRetriever.getKey(bucketName, fileName);
      const { keyId, signingKey } = result.value as SigningKey;

      expect(result.isError).toStrictEqual(false);
      expect(keyId).toStrictEqual(
        "iyVpkshZ0QKq5ORWz7mc76x0dAKUp4RS113tiHACjpQ",
      );
      expect(signingKey.constructor.name).toStrictEqual("PrivateKeyObject");
    });
  });
});

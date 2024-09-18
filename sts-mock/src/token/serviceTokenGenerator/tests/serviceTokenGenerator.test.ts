import {
  GetObjectCommand,
  GetObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { ServiceTokenGenerator } from "../serviceTokenGenerator";

const mockS3Client = mockClient(S3Client);

const s3Response = (content: string) => {
  return {
    transformToString: async () => content,
  };
};

describe("Service Token Generator", () => {
  const issuer = "test-issuer";
  const bucketName = "test-bucket-name";
  const fileName = "test-file-name";
  const sub = "test-sub";
  const scope = "mock_service_name.mock_apiName.mock_accessLevel";
  const tokenExpiry = 360;

  let serviceTokenGenerator: ServiceTokenGenerator;

  beforeEach(() => {
    serviceTokenGenerator = new ServiceTokenGenerator(
      issuer,
      bucketName,
      fileName,
      tokenExpiry,
      sub,
      scope,
    );
  });

  afterEach(() => {
    mockS3Client.reset();
  });

  describe("Given an error happens trying to retrieve the private key from S3", () => {
    it("Returns an error response", async () => {
      mockS3Client
        .on(GetObjectCommand)
        .rejects(new Error("Failed to get object from S3"));

      const result = await serviceTokenGenerator.generateServiceToken();

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error getting object from S3",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the private key retrieved from S3 is not a valid JWK", () => {
    it("Returns an error response", async () => {
      mockS3Client.on(GetObjectCommand).resolves({
        Body: s3Response('{"jwks": "notAValidJwks"}'),
      } as GetObjectCommandOutput);

      const result = await serviceTokenGenerator.generateServiceToken();

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error formatting private key",
        errorCategory: "SERVER_ERROR",
      });
    });
  });
});

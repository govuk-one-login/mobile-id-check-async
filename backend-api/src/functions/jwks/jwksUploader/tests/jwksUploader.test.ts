import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { JwksUploader } from "../jwksUploader";
import { Jwks } from "../../../types/jwks";
import { ErrorCategory } from "../../../utils/result";

const mockS3Client = mockClient(S3Client);

describe("JWKS Uploader", () => {
  const jwks: Jwks = {
    keys: [
      {
        alg: "RSA-OAEP-256",
        e: "AQAB",
        kid: "0df22121-40cc-41d7-b25c-b4da1a06ac24",
        kty: "RSA",
        n: "kOBby1nEUcKc-94zIa2qCyqDSE1-2bLWkVjeF3DWY_0v2j9wlLSaR6asONen_HP40wftLOSPYRcKYv6Cjz3LOY7aQYznX14EXSgJxrDwQ7AleX2VS_HB34LMZEa3xmSSH7pLtw_vmJgCNss0zDQLCz1sQwZxlqphF18FdTTUrXbJ9Qk3xIrEzvL2naO2r6WoLBQ9tSr2Sz9TTcJQptfh6hOAHm66oPA6F9uCmbTDEQeI-wLiMMArtcKrGiPAFluo8f0qNkzLRMFIqyadnZ9OZ5u0-H_urOkmLJ2nbAnyTcO-9QeDlomdEMz3yEaJeUoq-jnPpVEfIbd8-07fl7M27w",
        use: "enc",
      },
    ],
  };
  const bucketName = "test-bucket-name";
  const fileName = "test-file-name";
  let jwksUploader: JwksUploader;

  beforeEach(() => {
    jwksUploader = new JwksUploader();
  });

  afterEach(() => {
    mockS3Client.reset();
  });

  describe("Given an error happens trying to upload the JWKS to S3", () => {
    it("Returns an error response", async () => {
      mockS3Client
        .on(PutObjectCommand)
        .rejects(new Error("Failed to upload object to S3"));

      const uploadJwksResponse = await jwksUploader.uploadJwks(
        jwks,
        bucketName,
        fileName,
      );

      expect(uploadJwksResponse.isError).toBe(true);
      expect(uploadJwksResponse.value).toStrictEqual({
        errorMessage: "Error uploading file to S3",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given the JWKS is successfully uploaded to S3", () => {
    it("Returns a success response", async () => {
      mockS3Client.on(PutObjectCommand).resolves({});

      const uploadJwksResponse = jwksUploader.uploadJwks(
        jwks,
        bucketName,
        fileName,
      );

      expect((await uploadJwksResponse).isError).toBe(false);
      expect((await uploadJwksResponse).value).toStrictEqual(null);
    });
  });
});

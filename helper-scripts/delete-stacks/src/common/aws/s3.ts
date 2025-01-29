import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "./aws-clients.js";

const deleteBucket = async (bucketId: string): Promise<void> => {
  const deleteBucketCommand = new DeleteBucketCommand({ Bucket: bucketId });
  await s3Client.send(deleteBucketCommand);
};

export const deleteObject = async (bucketId: string): Promise<void> => {
  const objects = await getObjectKeysInBucket(bucketId);
  if (objects.length > 0) {
    const deleteObjectsCommand = new DeleteObjectsCommand({
      Bucket: bucketId,
      Delete: { Objects: objects },
    });
    await s3Client.send(deleteObjectsCommand);
  }
  await deleteBucket(bucketId);
};

const getObjectKeysInBucket = async (
  bucketId: string,
): Promise<{ VersionId: string; Key: string }[]> => {
  const listObjectsV2Command = new ListObjectVersionsCommand({
    Bucket: bucketId,
  });

  const output = await s3Client.send(listObjectsV2Command);
  if (!output) return [];
  if(!output.Versions) return []

  return output.Versions!.map((version) => {
    return { VersionId: version.VersionId!, Key: version.Key! };
  });
};

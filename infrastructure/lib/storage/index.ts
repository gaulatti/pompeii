import { Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';

const createBuckets = (stack: Stack) => {
  const frontendBucket = new Bucket(stack, `${stack.stackName}FrontendBucket`, {
    bucketName: `${stack.stackName.toLowerCase()}-frontend`,
  });

  const assetsBucket = new Bucket(stack, `${stack.stackName}AssetsBucket`, {
    bucketName: `${stack.stackName.toLowerCase()}-assets`,
  });

  return { frontendBucket, assetsBucket };
};

export { createBuckets };

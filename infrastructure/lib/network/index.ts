import { Duration, Stack } from 'aws-cdk-lib';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  CachePolicy,
  Distribution,
  ErrorResponse,
  OriginAccessIdentity,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CnameRecord, HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';

const createHostedZone = (stack: Stack) => {
  const hostedZone = HostedZone.fromHostedZoneAttributes(
    stack,
    `${stack.stackName}HostedZone`,
    {
      hostedZoneId: process.env.HOSTED_ZONE_ID!,
      zoneName: process.env.HOSTED_ZONE_NAME!,
    },
  );

  return { hostedZone };
};

const createZoneCertificate = (stack: Stack) => {
  const certificate = Certificate.fromCertificateArn(
    stack,
    `${stack.stackName}Certificate`,
    process.env.HOSTED_ZONE_CERTIFICATE!,
  );

  return { certificate };
};

const createDistribution = (
  stack: Stack,
  s3BucketSource: Bucket,
  certificate: ICertificate,
) => {
  const originAccessIdentity = new OriginAccessIdentity(
    stack,
    `${stack.stackName}DistributionOAI`,
  );

  s3BucketSource.grantRead(originAccessIdentity);

  const distribution = new Distribution(stack, `${stack.stackName}Distribution`, {
    defaultBehavior: {
      origin: S3BucketOrigin.withOriginAccessIdentity(s3BucketSource, {
        originAccessIdentity,
      }),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
    },
    defaultRootObject: 'index.html',
    domainNames: [`pompeii.${process.env.HOSTED_ZONE_NAME}`],
    certificate,
    minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    errorResponses: [
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.seconds(0),
      } as ErrorResponse,
    ],
  });

  return { distribution };
};

const createCNAME = (
  stack: Stack,
  zone: IHostedZone,
  distribution: Distribution,
) => {
  const record = new CnameRecord(stack, `${stack.stackName}FrontendCNAME`, {
    recordName: 'pompeii',
    zone,
    domainName: distribution.distributionDomainName,
  });

  return { record };
};

export { createCNAME, createDistribution, createHostedZone, createZoneCertificate };

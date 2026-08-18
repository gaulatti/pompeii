import { Duration, Stack } from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  CachePolicy,
  Distribution,
  OriginAccessIdentity,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  AaaaRecord,
  ARecord,
  HostedZone,
  IHostedZone,
  RecordTarget,
} from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export function createHostedZone(
  stack: Stack,
  hostedZoneId: string,
  zoneName: string,
): IHostedZone {
  return HostedZone.fromHostedZoneAttributes(
    stack,
    `${stack.stackName}HostedZone`,
    {
      hostedZoneId,
      zoneName,
    },
  );
}

export function createDistribution(
  stack: Stack,
  frontendBucket: IBucket,
  certificate: ICertificate,
  frontendDomain: string,
): Distribution {
  const originAccessIdentity = new OriginAccessIdentity(
    stack,
    `${stack.stackName}DistributionOriginAccessIdentity`,
  );
  frontendBucket.grantRead(originAccessIdentity);

  return new Distribution(stack, `${stack.stackName}FrontendDistribution`, {
    defaultBehavior: {
      origin: S3BucketOrigin.withOriginAccessIdentity(frontendBucket, {
        originAccessIdentity,
      }),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      compress: true,
    },
    defaultRootObject: 'index.html',
    domainNames: [frontendDomain],
    certificate,
    minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    errorResponses: [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.seconds(0),
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.seconds(0),
      },
    ],
  });
}

export function createRoute53Alias(
  stack: Stack,
  hostedZone: IHostedZone,
  distribution: Distribution,
): void {
  const target = RecordTarget.fromAlias(new CloudFrontTarget(distribution));
  new ARecord(stack, `${stack.stackName}FrontendAliasIpv4`, {
    zone: hostedZone,
    recordName: 'pompeii',
    target,
  });
  new AaaaRecord(stack, `${stack.stackName}FrontendAliasIpv6`, {
    zone: hostedZone,
    recordName: 'pompeii',
    target,
  });
}

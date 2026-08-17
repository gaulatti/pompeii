import * as cdk from 'aws-cdk-lib';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import {
  createDistribution,
  createHostedZone,
  createRoute53Alias,
} from './network';
import { createPermissions } from './permissions';
import { createFrontendBucket } from './storage';

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export class PompeiiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const zoneName = requiredEnvironment('HOSTED_ZONE_NAME');
    const secretArn = requiredEnvironment('SECRET_ARN');
    const frontendDomain = `pompeii.${zoneName}`;

    const hostedZone = createHostedZone(
      this,
      requiredEnvironment('HOSTED_ZONE_ID'),
      zoneName,
    );
    const certificate = new Certificate(this, 'FrontendCertificate', {
      domainName: frontendDomain,
      validation: CertificateValidation.fromDns(hostedZone),
    });
    const frontendBucket = createFrontendBucket(this);
    const distribution = createDistribution(
      this,
      frontendBucket,
      certificate,
      frontendDomain,
    );
    createRoute53Alias(this, hostedZone, distribution);

    const logGroup = new LogGroup(this, 'ServiceLogGroup', {
      logGroupName: '/services/pompeii',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const applicationSecret = Secret.fromSecretCompleteArn(
      this,
      'ApplicationSecret',
      secretArn,
    );
    const { githubActionsUser, onPremisesUser } = createPermissions(this);

    frontendBucket.grantReadWrite(githubActionsUser);
    distribution.grantCreateInvalidation(githubActionsUser);
    logGroup.grantWrite(onPremisesUser);
    applicationSecret.grantRead(onPremisesUser);

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Set GitHub variable BUCKET_NAME to this value.',
    });
    new cdk.CfnOutput(this, 'FrontendDistributionId', {
      value: distribution.distributionId,
      description: 'Set GitHub variable DISTRIBUTION_ID to this value.',
    });
    new cdk.CfnOutput(this, 'FrontendFqdn', {
      value: `https://${frontendDomain}`,
      description: 'Set GitHub variable VITE_FQDN to this value.',
    });
    new cdk.CfnOutput(this, 'ServiceLogGroupName', {
      value: logGroup.logGroupName,
      description: 'Set GitHub variable LOGS_GROUP to this value.',
    });
  }
}

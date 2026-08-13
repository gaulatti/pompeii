import * as cdk from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { ArnPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  createCNAME,
  createDistribution,
  createHostedZone,
  createZoneCertificate,
} from './network';
import { createPermissions } from './permissions';
import { createBuckets } from './storage';

export class PompeiiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { hostedZone } = createHostedZone(this);
    const { certificate } = createZoneCertificate(this);
    const { frontendBucket } = createBuckets(this);
    const { githubActionsUser } = createPermissions(this);

    frontendBucket.grantReadWrite(githubActionsUser);

    const repository = new Repository(this, `${this.stackName}EcrRepository`, {
      repositoryName: `${this.stackName.toLocaleLowerCase()}`,
    });

    repository.grantPullPush(githubActionsUser);

    new LogGroup(this, `${this.stackName}ServiceLogGroup`, {
      logGroupName: '/services/pompeii-service',
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const { distribution } = createDistribution(this, frontendBucket, certificate);
    distribution.grantCreateInvalidation(githubActionsUser);

    createCNAME(this, hostedZone, distribution);

    new Role(this, `${this.stackName}ServiceRole`, {
      assumedBy: new ArnPrincipal(process.env.SERVICE_ROLE_ARN!),
      roleName: `${this.stackName}ServiceRole`,
    });
  }
}

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PompeiiStack } from '../lib';

describe('PompeiiStack', () => {
  let template: Template;

  beforeAll(() => {
    process.env.HOSTED_ZONE_ID = 'Z0123456789';
    process.env.HOSTED_ZONE_NAME = 'example.com';

    const app = new App();
    template = Template.fromStack(
      new PompeiiStack(app, 'Pompeii', {
        env: { account: '123456789012', region: 'us-east-1' },
      }),
    );
  });

  it('creates the private frontend bucket and CloudFront distribution', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['pompeii.example.com'],
        DefaultRootObject: 'index.html',
        Enabled: true,
      }),
    });
  });

  it('creates Route 53 aliases for the frontend', () => {
    template.resourceCountIs('AWS::Route53::RecordSet', 2);
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'pompeii.example.com.',
      Type: 'A',
    });
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'pompeii.example.com.',
      Type: 'AAAA',
    });
  });

  it('creates the retained Pompeii log group', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/services/pompeii',
      RetentionInDays: 30,
    });
  });

  it('creates a scoped GitHub frontend deployment user', () => {
    template.resourceCountIs('AWS::IAM::User', 1);
    template.resourceCountIs('AWS::IAM::AccessKey', 1);
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).toContain('s3:PutObject');
    expect(policies).toContain('cloudfront:CreateInvalidation');
    expect(policies).not.toContain('logs:PutLogEvents');
    expect(policies).not.toContain('secretsmanager:GetSecretValue');
  });

  it('does not provision obsolete ECR or assets resources', () => {
    template.resourceCountIs('AWS::ECR::Repository', 0);
    template.resourceCountIs('AWS::IAM::Role', 0);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });
});

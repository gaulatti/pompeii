import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';

const googleAttributeMapping = {
  email: 'email',
  email_verified: 'email_verified',
  family_name: 'family_name',
  given_name: 'given_name',
  picture: 'picture',
  username: 'sub',
};

export function manageGoogleIdentityProvider(
  stack: Stack,
  userPoolId: string,
): void {
  const call = {
    service: 'CognitoIdentityServiceProvider',
    action: 'updateIdentityProvider',
    parameters: {
      UserPoolId: userPoolId,
      ProviderName: 'Google',
      AttributeMapping: googleAttributeMapping,
    },
    physicalResourceId: PhysicalResourceId.of(
      `${userPoolId}:Google:email-verified-mapping`,
    ),
  };

  new AwsCustomResource(stack, 'GoogleIdentityProviderMapping', {
    onCreate: call,
    onUpdate: call,
    policy: AwsCustomResourcePolicy.fromStatements([
      new PolicyStatement({
        actions: ['cognito-idp:UpdateIdentityProvider'],
        resources: [
          stack.formatArn({
            service: 'cognito-idp',
            resource: 'userpool',
            resourceName: userPoolId,
          }),
        ],
      }),
    ]),
    installLatestAwsSdk: false,
  });
}

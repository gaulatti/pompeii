import { CfnOutput, Stack } from 'aws-cdk-lib';
import { CfnAccessKey, User } from 'aws-cdk-lib/aws-iam';

export function createOnPremisesPermissions(stack: Stack): {
  onPremisesUser: User;
} {
  const onPremisesUser = new User(stack, 'OnPremisesUser', {
    userName: `${stack.stackName.toLowerCase()}-on-premises-user`,
  });
  const accessKey = new CfnAccessKey(stack, 'OnPremisesAccessKey', {
    userName: onPremisesUser.userName,
  });

  new CfnOutput(stack, 'OnPremisesAccessKeyId', {
    value: accessKey.ref,
    description: 'Install as AWS_ACCESS_KEY_ID on the deployment host.',
  });
  new CfnOutput(stack, 'OnPremisesSecretAccessKey', {
    value: accessKey.attrSecretAccessKey,
    description: 'Install as AWS_SECRET_ACCESS_KEY on the deployment host.',
  });

  return { onPremisesUser };
}

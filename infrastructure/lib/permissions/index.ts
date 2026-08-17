import { Stack } from 'aws-cdk-lib';
import { createGitHubActionsPermissions } from './github-actions';
import { createOnPremisesPermissions } from './on-premises';

const createPermissions = (stack: Stack) => {
  const { githubActionsUser } = createGitHubActionsPermissions(stack);
  const { onPremisesUser } = createOnPremisesPermissions(stack);
  return { githubActionsUser, onPremisesUser };
};

export { createPermissions };

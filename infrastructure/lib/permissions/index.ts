import { Stack } from 'aws-cdk-lib';
import { createGitHubActionsPermissions } from './github-actions';

const createPermissions = (stack: Stack) => {
  const { githubActionsUser } = createGitHubActionsPermissions(stack);
  return { githubActionsUser };
};

export { createPermissions };

import { type User } from '../../models/user';
import { type State } from "../store";

const isAuthenticated = (state: State): boolean => {
  return !!state.auth.currentUser;
};

const currentUser = (state: State): User | undefined => {
  return state.auth.currentUser;
};

const isLoaded = (state: State): boolean => {
  return state.auth.loaded;
};

const isSuperAdmin = (state: State): boolean => {
  const user = state.auth.currentUser;
  return Boolean(
    user?.roleAssignments?.some(
      (assignment) =>
        assignment.team_id === null && assignment.role?.key === 'platform-admin',
    ),
  );
};

export { isAuthenticated, isLoaded, currentUser, isSuperAdmin };

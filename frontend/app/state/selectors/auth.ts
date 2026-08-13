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
  if (!user?.memberships) return false;
  return user.memberships.some(
    (m: any) => m.teams_id === 1 && m.role === 1,
  );
};

export { isAuthenticated, isLoaded, currentUser, isSuperAdmin };

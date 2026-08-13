import { type User } from '../../models/user';

export interface AuthStore {
  currentUser?: User;
  loaded: boolean;
}

const store: AuthStore = { loaded: false };

export default store;

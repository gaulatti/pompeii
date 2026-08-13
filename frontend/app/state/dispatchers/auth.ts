import { type User } from '../../models/user';
import { type ReduxAction } from './base';

/**
 * Represents a login action.
 * @interface
 * @extends ReduxAction
 */
export interface LoginAction extends ReduxAction {
  payload: User | undefined;
}

/**
 * Logs in the user.
 * @param user - The user object.
 * @returns The login action.
 */
const login = (user?: User): LoginAction => {
  return { type: 'LOGIN', payload: user };
};

/**
 * Logs out the user.
 * @returns {ReduxAction} The Redux action object for logout.
 */
const logout = (): ReduxAction => {
  return { type: 'LOGOUT' };
};

/**
 * Sets the current user in the Redux store.
 *
 * @param user - The user object to set as the current user.
 * @returns A Redux action object with the type 'SET_CURRENT_USER' and the user object as the payload.
 */
const setCurrentUser = (user: User): ReduxAction => {
  return { type: 'SET_CURRENT_USER', payload: user };
};

const setAuthLoaded = (): ReduxAction => {
  return { type: 'SET_AUTH_LOADED' };
};

export { login, logout, setCurrentUser, setAuthLoaded };

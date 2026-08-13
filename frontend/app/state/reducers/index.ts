import { type ReduxAction } from '../dispatchers/base';
import defaultStore, { type State } from '../store';
import { authReducer } from './auth';
import { enumsReducer } from './enums';
import { featureFlagsReducer } from './featureFlags';
import { lifecycleReducer } from './lifecycle';
import { teamsReducer } from './teams';

/**
 * Root reducer function that combines all the reducers in the application.
 * @param state - The current state of the application.
 * @param action - The action object that describes the state change.
 * @returns The new state of the application after applying the reducer functions.
 */
const reducers = (state: State = defaultStore, action: ReduxAction) => {
  const reducerStack = [authReducer, teamsReducer, enumsReducer, featureFlagsReducer, lifecycleReducer];

  /**
   * Allowing multiple contextual reducers
   */
  reducerStack.forEach((reducer) => {
    state = reducer(state, action)!;
  });

  return state;
};

export { reducers };

import { type ReduxAction } from '../dispatchers/base';
import defaultStore, { type State } from '../store';

/**
 * Reducer function for the lifecycle state.
 *
 * @param state - The current state.
 * @param action - The Redux action.
 * @returns The updated state.
 */
const lifecycleReducer = (state: State = defaultStore, action: ReduxAction) => {
  switch (action.type) {
    case 'KICKOFF':
      return {
        ...state,
        kickoffReady: false,
        kickoffError: null,
      };
    case 'SET_KICKOFF_READY':
      return {
        ...state,
        kickoffReady: true,
        kickoffError: null,
      };
    case 'SET_KICKOFF_ERROR':
      return {
        ...state,
        kickoffReady: false,
        kickoffError: action.payload as { message: string; status?: number },
      };
    default:
      return state;
  }
};

export { lifecycleReducer };

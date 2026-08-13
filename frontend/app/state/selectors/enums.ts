import { type State } from '../store';

/**
 * Retrieves the enums from the state.
 *
 * @param state - The state object.
 * @returns The enums from the state.
 */
const getEnums = (state: State) => {
  return state.enums;
};

export { getEnums };

import { type ReduxAction } from './base';

/**
 * Update the redux store with all the enums.
 *
 * This is executed after as part of kickoff.
 */
export const setEnums = (enums: Record<string, string[]>): ReduxAction => {
  return { type: 'SET_ENUMS', payload: enums };
};

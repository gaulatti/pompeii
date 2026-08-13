import { type State } from "../store";

/**
 * Retrieves the kickoff ready status from the state.
 * @param state - The application state.
 * @returns A boolean indicating whether the kickoff is ready.
 */
const getKickoffReady = (state: State): boolean => {
  return !!state.kickoffReady;
};

const getKickoffError = (state: State): { message: string; status?: number } | null => state.kickoffError;

export { getKickoffReady, getKickoffError };

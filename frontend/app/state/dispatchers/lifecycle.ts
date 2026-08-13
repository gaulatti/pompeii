import { type ReduxAction } from "./base";

const setKickoff = (): ReduxAction => {
  return { type: "KICKOFF" };
};

const setKickoffReady = (): ReduxAction => {
  return { type: "SET_KICKOFF_READY" };
};

const setKickoffError = (error: { message: string; status?: number }): ReduxAction => {
  return { type: 'SET_KICKOFF_ERROR', payload: error };
};

export { setKickoff, setKickoffReady, setKickoffError };

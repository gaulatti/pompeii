import { takeLatest } from "redux-saga/effects";
import { setDefaultTeam, setTeams } from "../handlers/teams";

function* teamsLifecycle() {
  /**
   * Set Default Team
   */
  yield takeLatest("SET_TEAMS", setTeams);
  yield takeLatest("SET_DEFAULT_TEAM", setDefaultTeam);
}

export { teamsLifecycle };

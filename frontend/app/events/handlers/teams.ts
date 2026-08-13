import { put, select } from 'redux-saga/effects';
import { type Team } from '../../models/team';
import { type ReduxAction } from '../../state/dispatchers/base';
import { setDefaultTeam as defaultTeamDispatcher, setCurrentTeam } from '../../state/dispatchers/teams';
import { getTeams } from '../../state/selectors/teams';

/**
 * Set Default Team
 */
function* setTeams({ payload }: ReduxAction) {
  const currentTeam = (payload as Team[]).find((t) => t.selected);
  if (!currentTeam) {
    yield put(defaultTeamDispatcher());
  }
}

function* setDefaultTeam({ payload }: ReduxAction) {
  const teams: Team[] = yield select(getTeams) || payload;
  const firstTeam = teams.find(Boolean);

  /**
   * If there's a team, let's set it as current
   */
  if (firstTeam) {
    yield put(setCurrentTeam(firstTeam.id));
  }
}

export { setDefaultTeam, setTeams };

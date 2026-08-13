import { type Team } from '../../models/team';
import { type ReduxAction } from './base';

/**
 * Update the redux store with all the teams.
 *
 * This is executed after as part of kickoff.
 */
export const setTeams = (teams: Team[]): ReduxAction => {
  return { type: 'SET_TEAMS', payload: teams };
};

/**
 * Sets the current team.
 *
 * This could be executed as part of:
 * 1. Kickoff
 */
export const setCurrentTeam = (id: number): ReduxAction => {
  return { type: 'SET_CURRENT_TEAM', payload: id };
};

/**
 * Sets the default team. Basically it's the first one in the list.
 *
 * This is executed after kickoff and it's only handled by redux-saga,
 * which then will execute setCurrentTeam.
 */
export const setDefaultTeam = (): ReduxAction => {
  return { type: 'SET_DEFAULT_TEAM' };
};

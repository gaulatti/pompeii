import { type Team } from '../../models/team';
import { type ReduxAction } from '../dispatchers/base';
import defaultStore, { type State } from '../store';
import { type Reducer } from './base';

const setTeamsReducer = (state: State, action: ReduxAction): State => {
  return {
    ...state,
    teams: action.payload as Team[],
  };
};

const setCurrentTeamReducer = (state: State, action: ReduxAction): State => {
  const { payload } = action;

  const newTeams: Team[] = [];
  state.teams.forEach((d) => newTeams.push({ ...d, selected: d.id == payload }));

  return {
    ...state,
    teams: newTeams,
  };
};

const reducerCatalog: Reducer[] = [
  { action: 'SET_TEAMS', handler: setTeamsReducer },
  { action: 'SET_CURRENT_TEAM', handler: setCurrentTeamReducer },
];

export const teamsReducer = (state: State = defaultStore, action: ReduxAction) => {
  const handler = reducerCatalog.find((i) => i.action === action.type)?.handler;

  return handler ? handler(state, action) : state;
};

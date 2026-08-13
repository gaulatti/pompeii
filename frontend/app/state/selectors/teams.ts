import { type Team } from "../../models/team";
import { type State } from "../store";

const getTeams = (state: State): Team[] => {
  return state.teams;
};

const getCurrentTeam = (state: State): Team | undefined =>
  state.teams.find((t) => t.selected);

export { getTeams, getCurrentTeam };

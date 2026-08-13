import { type State } from "../store";
import { type ReduxAction } from '../dispatchers/base';

export interface Reducer {
  action: string;
  handler: (state: State, action: ReduxAction) => State;
}

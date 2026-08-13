import { type ReduxAction } from '../dispatchers/base';
import defaultStore, { type State } from '../store';
import { type Reducer } from './base';

const setEnumsReducer = (state: State, action: ReduxAction): State => {
  return {
    ...state,
    enums: action.payload as Record<string, string[]>,
  };
};

const reducerCatalog: Reducer[] = [{ action: 'SET_ENUMS', handler: setEnumsReducer }];

export const enumsReducer = (state: State = defaultStore, action: ReduxAction) => {
  const handler = reducerCatalog.find((i) => i.action === action.type)?.handler;

  return handler ? handler(state, action) : state;
};

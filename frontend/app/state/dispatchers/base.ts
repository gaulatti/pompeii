import { type UnknownAction } from '@reduxjs/toolkit';

export interface ReduxAction extends UnknownAction {
  type: string;
  payload?: any;
}

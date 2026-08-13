import { takeLatest } from '@redux-saga/core/effects';
import { checkSession, login } from '../handlers/auth';
import { fork } from 'redux-saga/effects';

/**
 * Handles the authentication lifecycle.
 */
function* authLifecycle() {
  yield fork(checkSession);
  yield takeLatest('LOGIN', login);
}

export { authLifecycle };

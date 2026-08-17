import { getAppSession } from '../../auth/session';
import { put, select } from 'redux-saga/effects';
import { login as loginDispatcher, setAuthLoaded } from '../../state/dispatchers/auth';
import { setKickoff } from '../../state/dispatchers/lifecycle';
import { currentUser as currentUserSelector } from '../../state/selectors/auth';
import { getKickoffReady } from '../../state/selectors/lifecycle';

/**
 * Checks the user's session and dispatches the appropriate actions based on the session status.
 * @returns An unknown value.
 */
function* checkSession(): unknown {
  try {
    const session = yield getAppSession();
    const isKickoffReady = yield select(getKickoffReady);

    const { userSub, token, payload = {} } = session;

    if (userSub && !isKickoffReady && token) {
      const sseWorker = new SharedWorker(new URL('../../engines/sse.shared.ts', import.meta.url), { type: 'module' });
      sseWorker.port.start();
      sseWorker.port.postMessage({ token });

      const name = payload.name || payload.given_name || '';
      const given_name = payload.given_name || payload.name || '';
      const family_name = payload.family_name || '';
      const email = payload.email || '';

      yield put(loginDispatcher({ sub: userSub, name, given_name, family_name, email }));
      return;
    }
  } catch (error) {
    console.warn('Session check failed. Marking auth as loaded.', error);
  }

  yield put(setAuthLoaded());
}

/**
 * Performs the login process.
 *
 * @returns An unknown value.
 */
function* login(): unknown {
  try {
    /**
     * Verify if there's a user before running kickoff
     */
    const currentUser = yield select(currentUserSelector);
    const isKickoffReady = yield select(getKickoffReady);

    if (currentUser && !isKickoffReady) {
      yield put(setKickoff());
    }
  } catch (e) {
    console.error('Error when setting login', e);
  }
}

export { checkSession, login };

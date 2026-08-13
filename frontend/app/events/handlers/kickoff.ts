import { put } from 'redux-saga/effects';
import { Method, sendRequest } from '~/clients/api';
import { setCurrentUser } from '../../state/dispatchers/auth';
import { setEnums } from '../../state/dispatchers/enums';
import { setFeatureFlags } from '../../state/dispatchers/featureFlags';
import { setKickoffError, setKickoffReady } from '../../state/dispatchers/lifecycle';
import { setTeams } from '../../state/dispatchers/teams';
import { pascalToCamelCase } from '../../utils/strings';

/**
 * Load initial data once the essential information changes.
 *
 * This can be helpful when the user is set (after login).
 */

function* kickoff(): Generator<any, void, any> {
  try {
    const result = yield sendRequest(Method.GET);
    const enums = result.enums || {};
    const features = result.features || [];

    /**
   * Replace the JWT-derived user with the full backend user (includes memberships).
   */
    if (result.me) {
      yield put(setCurrentUser(result.me));
    }

    /**
   * Set Feature Flags
   */
    yield put(setFeatureFlags(features));

    /**
   * We get teams from /authorization/teams instead of relying on 'me.memberships'
   */
    const teams = yield sendRequest(Method.GET, 'authorization/teams');
    yield put(setTeams(Array.isArray(teams) ? teams : []));

    /**
   * Set Enums
   */
    const parsedEnums: Record<string, string[]> = {};
    Object.entries(enums).forEach(([key, value]) => {
      parsedEnums[pascalToCamelCase(key)] = value as string[];
    });
    yield put(setEnums(parsedEnums));

  /**
   * Set Kickoff Ready
   */
    yield put(setKickoffReady());
  } catch (cause: any) {
    const responseMessage = cause?.response?.data?.message;
    yield put(setKickoffError({
      message: typeof responseMessage === 'string' ? responseMessage : 'Pompeii could not prepare your authorization workspace.',
      status: cause?.response?.status,
    }));
  }
}

export { kickoff };

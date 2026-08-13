import { takeLatest } from "redux-saga/effects";
import { kickoff } from "../handlers/kickoff";

function* kickoffLifecycle() {
  /**
   * Load initial data once the essential information changes.
   *
   * This can be helpful when:
   * 1. The user is set (after login).
   */
  yield takeLatest('KICKOFF', kickoff);
}

export { kickoffLifecycle };

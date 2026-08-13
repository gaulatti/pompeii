
import { type FeatureFlag } from "../../models/feature_flag";
import { type Team } from "../../models/team";
import auth, { type AuthStore } from "./auth";
import enums from "./enums";
import featureFlags from "./featureFlags";
import teams from "./teams";

/**
 * Represents the state of the application.
 */
export interface State {
  auth: AuthStore;
  featureFlags: FeatureFlag[];
  teams: Team[];
  enums: Record<string, string[]>;
  kickoffReady: boolean;
  kickoffError: { message: string; status?: number } | null;
}

/**
 * The application state store.
 */
const store: State = {
  auth,
  featureFlags,
  teams,
  enums,
  kickoffReady: false,
  kickoffError: null,
};

export default store;

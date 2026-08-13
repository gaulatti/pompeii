import { type State } from "../store";

const getFeatureFlags = (state: State) => {
  return state.featureFlags;
};

export { getFeatureFlags };

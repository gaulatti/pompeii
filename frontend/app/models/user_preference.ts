import { type FeatureFlag } from "./feature_flag";

export type UserPreference = {
  language: string;
  features: FeatureFlag;
};

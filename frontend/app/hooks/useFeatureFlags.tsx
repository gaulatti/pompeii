import { useSelector } from 'react-redux';
import { getFeatureFlags } from '../state/selectors/featureFlags';

/**
 * Custom hook to retrieve feature flags from the Redux store and check if a specific feature is enabled.
 *
 * @returns A function that takes a feature flag name and returns a boolean indicating whether the feature is enabled.
 *
 * @example
 * const isFeatureEnabled = useFeatureFlags();
 * const isNewFeatureEnabled = isFeatureEnabled('newFeature');
 */
const useFeatureFlags = (): ((flagName: string) => boolean) => {
  /**
   * Retrieve the feature flags from the Redux store.
   */
  const featureFlags = useSelector(getFeatureFlags);

  /**
   * Return a function that takes a feature flag name and returns a boolean indicating whether the feature is enabled.
   */
  return (flagName: string): boolean => {
    const feature = featureFlags.find((flag) => flag.key === flagName);
    return feature ? feature.isEnabled : false;
  };
};

export { useFeatureFlags };

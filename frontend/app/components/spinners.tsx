import { LoadingOverlay } from '~/lib/bleecker';
import type { JSX } from 'react';

/**
 * OverlaySpinner is a functional component that renders a full-screen overlay
 * with a centered spinner. The overlay has a white background and a high z-index
 * to ensure it appears above other content.
 *
 * @returns {JSX.Element} A div element containing the spinner.
 */
const OverlaySpinner = (): JSX.Element => (
  <div role="status" aria-live="polite">
    <span className="sr-only">Loading your workspace</span>
    <LoadingOverlay visible label="Loading your workspace" />
  </div>
);

export { OverlaySpinner };

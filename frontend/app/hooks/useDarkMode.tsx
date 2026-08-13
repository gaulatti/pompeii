import { useEffect, useState } from 'react';
/**
 * Custom hook to manage and detect the user's color scheme preference (dark mode).
 *
 * This hook sets up an event listener to detect changes in the user's color scheme preference
 * and updates the state accordingly. It returns an object containing the current dark mode state.
 *
 * @returns {Object} An object containing the current dark mode state.
 * @returns {boolean} isDarkMode - A boolean indicating whether dark mode is enabled.
 */
const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    /**
     * Event handler for changes in the color scheme preference.
     *
     * @param {MediaQueryListEvent} e - The event object representing the change in the media query's evaluated state.
     */
    const checkColorScheme = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    /**
     * Media query to detect changes in color scheme.
     */
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    /**
     * Add event listener to detect changes in color scheme.
     */
    mediaQuery.addEventListener('change', checkColorScheme);
    /**
     * Cleanup function to remove event listener.
     */
    return () => {
      mediaQuery.removeEventListener('change', checkColorScheme);
    };
  }, []);
  return { isDarkMode };
};
export { useDarkMode };

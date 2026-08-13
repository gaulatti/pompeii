import { useCallback, useState } from 'react';

/**
 * Custom hook that generates and manages a random number.
 *
 * @param {number} [initialValue] - Optional initial value for the random number. If not provided, a random number is generated.
 * @returns {[number, () => void]} - Returns a tuple containing the current random number and a function to re-randomize the number.
 */
const useRandom = (initialValue?: number): [number, () => void] => {
  const [randomValue, setRandomValue] = useState<number>(initialValue ?? Math.random());

  const reRandomize = useCallback(() => {
    setRandomValue(Math.random());
  }, []);

  return [randomValue, reRandomize];
};

export { useRandom };

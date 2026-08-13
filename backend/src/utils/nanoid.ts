import { customAlphabet } from 'nanoid';

/**
 * Generate a random string of 21 characters
 */
const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const nanoid = customAlphabet(alphabet, 21);

export { nanoid };

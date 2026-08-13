import { SetMetadata } from '@nestjs/common';

/**
 * The key used to store the public metadata.
 */
const IS_PUBLIC_KEY = 'isPublic';

/**
 * A decorator to mark a route or controller as public, meaning it does not require authentication.
 *
 * This decorator sets a metadata key (`IS_PUBLIC_KEY`) to `true` using the `SetMetadata` function.
 *
 * @returns A decorator function that sets the public metadata.
 */
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export { IS_PUBLIC_KEY, Public };

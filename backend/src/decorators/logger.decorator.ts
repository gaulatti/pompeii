import { JSONLogger } from 'src/utils/logger';

/**
 * A decorator function that initializes a logger instance for the specified realm
 * and assigns it to the decorated property.
 *
 * @param realm - The realm or context for the logger instance.
 * @returns A function that defines a property on the target object with the logger instance.
 */
export function Logger(realm: string) {
  /**
   * The decorator function that initializes the logger instance.
   */
  return function (target: any, propertyKey: string | symbol) {
    const loggerInstance = new JSONLogger(realm);

    /**
     * Define the property on the target object with the logger instance.
     */
    Object.defineProperty(target, propertyKey, {
      get: () => loggerInstance,
      enumerable: true,
      configurable: true,
    });
  };
}

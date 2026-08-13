/**
 * Converts a string to camel case.
 * @param str - The string to convert.
 * @returns The camel case version of the input string.
 */
const pascalToCamelCase = (str: string): string => {
  if (str.length === 0) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
};

export { pascalToCamelCase };

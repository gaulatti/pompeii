/**
 * The port number for the gRPC and HTTP servers.
 *
 * The container ports are fixed; deployment may map different host ports.
 *
 * @constant
 * @type {number}
 */
const grpcPort = 50087;
const httpPort = 3187;

/**
 * Extracts the hostname and port from a given URL string.
 *
 * @param input - The URL string to parse.
 * @returns An object containing the hostname and port.
 * @throws Will throw an error if the input is not a valid URL.
 */
const getHostAndPort = (input: string): { hostname: string; port: number } => {
  try {
    const url = new URL(input);
    const hostname = url.hostname;
    const port = parseInt(url.port, 10);

    return { hostname, port };
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }
};

export { getHostAndPort, grpcPort, httpPort };

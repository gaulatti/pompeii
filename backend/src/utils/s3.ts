import { Readable } from 'stream';

/**
 * Converts a readable stream to a string.
 *
 * @param stream - The readable stream to convert.
 * @returns A promise that resolves to the string representation of the stream.
 */
const streamToString = async (stream: Readable): Promise<string> => {
  const chunks: Uint8Array[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () =>
      resolve(new TextDecoder('utf-8').decode(Buffer.concat(chunks))),
    );
    stream.on('error', reject);
  });
};

export { streamToString };

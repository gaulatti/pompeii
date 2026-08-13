import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import { createWriteStream } from 'fs';
import { join } from 'path';

/**
 * Initialize dotenv to get DB Credentials
 */
config();

/**
 * The AWS Secrets Manager client.
 */
const secretsClient = new SecretsManagerClient();

/**
 * The AWS S3 client.
 */
const s3Client = new S3Client();

/**
 * Fetches the database credentials from environment variables or AWS Secrets Manager.
 *
 * @returns {Promise<{ username: string; password: string; host: string }>}
 * A promise that resolves to an object containing the database credentials.
 *
 * @throws {Error} If no credentials are provided.
 *
 * The function first checks if the database credentials (username, password, and host)
 * are available in the environment variables. If they are, it returns them.
 * If not, it checks if the `DB_CREDENTIALS` environment variable is set, which should
 * contain the ID of the secret in AWS Secrets Manager. It then fetches the secret
 * from AWS Secrets Manager, parses it, and returns the credentials.
 * If neither of these conditions are met, it throws an error indicating that the
 * database credentials are not provided.
 */
const fetchDatabaseCredentials = async (): Promise<{
  username: string;
  password: string;
  host: string;
}> => {
  if (
    process.env.DB_USERNAME &&
    process.env.DB_PASSWORD &&
    process.env.DB_HOST
  ) {
    return {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
    };
  } else if (process.env.DB_CREDENTIALS) {
    const command = new GetSecretValueCommand({
      SecretId: process.env.DB_CREDENTIALS,
    });

    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    return {
      username: secret.username,
      password: secret.password,
      host: process.env.DB_HOST_RDS!,
    };
  }

  /**
   * If no credentials are provided, throw an error.
   */
  throw new Error('Database credentials are not provided.');
};

/**
 * Fetches the latest database backup file from an S3 bucket.
 *
 * This function retrieves all objects in the specified S3 bucket with the prefix 'backups/'.
 * It then identifies the latest backup file based on the LastModified date and downloads it
 * to a temporary location on the local filesystem.
 *
 * @returns {Promise<string>} A promise that resolves to the path of the downloaded backup file.
 *
 * @throws {Error} If the bucket name is not defined in environment variables.
 * @throws {Error} If no backup files are found in the S3 bucket.
 * @throws {Error} If the latest file does not have a valid key.
 * @throws {Error} If the backup file body cannot be retrieved from S3.
 */
const fetchDatabaseBackup = async (): Promise<string> => {
  const bucketName = process.env.ASSETS_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('Bucket name is not defined in environment variables.');
  }

  let continuationToken: string | undefined;
  let allContents: Array<{ Key?: string; LastModified?: Date }> = [];

  /**
   * Fetch all the objects in the S3 bucket with the prefix 'backups/'
   */
  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'backups/',
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);
    if (listResponse.Contents) {
      allContents = [...allContents, ...listResponse.Contents];
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  if (allContents.length === 0) {
    throw new Error('No backup files found in S3 bucket');
  }

  /**
   * Find the latest backup file based on the LastModified date.
   */
  const latestFile = allContents.reduce((latest, current) =>
    latest.LastModified &&
    current.LastModified &&
    latest.LastModified > current.LastModified
      ? latest
      : current,
  );

  if (!latestFile.Key) {
    throw new Error('Latest file does not have a valid key.');
  }

  console.log(`Latest backup file found: ${latestFile.Key}`);

  /**
   * Download the latest backup file from S3.
   */
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: latestFile.Key,
  });

  const { Body } = await s3Client.send(getCommand);
  if (!Body) {
    throw new Error('Failed to retrieve backup file body from S3.');
  }

  const backupPath = join('/tmp', 'backup.sql');

  const writeStream = createWriteStream(backupPath);
  const bodyStream = Body.transformToWebStream();
  const readableStream = bodyStream.getReader();
  const pump = () =>
    readableStream.read().then(({ done, value }) => {
      if (done) {
        writeStream.end();
        return;
      }
      writeStream.write(value);
      pump();
    });

  pump();

  await new Promise<void>((resolve) => writeStream.on('finish', resolve));
  return backupPath;
};

/**
 * Synchronizes the database by dropping the existing database, creating a new one,
 * and applying a backup.
 *
 * @throws {Error} If attempting to sync to the production database without override.
 *
 * @remarks
 * This function fetches the database credentials and backup, then uses `mysqladmin`
 * and `mysql` commands to drop, create, and restore the database.
 *
 * @example
 * ```typescript
 * await syncDatabase();
 * ```
 */
const syncDatabase = async (): Promise<void> => {
  const { DB_HOST, DB_PORT, DB_DATABASE, OVERRIDE_PROD } = process.env;

  /**
   * Don't forget to delete the WHERE in the DELETE FROM.
   * https://www.youtube.com/watch?v=i_cVJgIz_Cs
   */
  if (DB_DATABASE === 'autobahn' && !OVERRIDE_PROD) {
    throw new Error("You cannot sync to the autobahn database. That's PROD.");
  }

  const credentials = await fetchDatabaseCredentials();
  const { username, password } = credentials;

  execSync(
    `mysqladmin -h ${DB_HOST} -P ${DB_PORT} -u ${username} -p${password} drop ${DB_DATABASE} -f`,
  );

  execSync(
    `mysqladmin -h ${DB_HOST} -P ${DB_PORT} -u ${username} -p${password} create ${DB_DATABASE}`,
  );

  const backupSql = await fetchDatabaseBackup();
  execSync(
    `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${username} -p${password} ${DB_DATABASE} < ${backupSql}`,
  );
  console.log(`Database backup applied from ${backupSql}`);
};

syncDatabase().catch((err) => {
  console.error('Error during database synchronization:', err);
});

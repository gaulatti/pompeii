import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Represents the credentials required to connect to a database.
 *
 * @property {string} host - The hostname or IP address of the database server.
 * @property {string} port - The port number on which the database server is listening.
 * @property {string} username - The username to authenticate with the database.
 * @property {string} password - The password to authenticate with the database.
 * @property {string} database - The name of the database to connect to.
 */
export type DatabaseCredentials = {
  host: string;
  port: string | number;
  username: string;
  password: string;
  database: string;
};

/**
 * Service responsible for performing database backups and uploading them to S3.
 */
@Injectable()
export class BackupService {
  /**
   * Logger instance for logging messages.
   */
  private readonly logger = new Logger(BackupService.name);

  /**
   * S3 client for interacting with AWS S3.
   */
  private readonly s3Client = new S3Client();

  /**
   * Secrets Manager client for retrieving database credentials.
   */
  private readonly secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });

  /**
   * Name of the S3 bucket where backups will be stored.
   */
  private readonly bucketName = process.env.ASSETS_BUCKET_NAME;

  /**
   * Backs up the database by performing the following steps:
   * 1. Retrieves the database credentials.
   * 2. Generates a SQL dump file using `pg_dump` and saves it to a temporary file.
   * 3. Uploads the SQL dump file to an S3 bucket.
   * 4. Deletes the temporary SQL dump file.
   * 5. Logs the success or failure of the backup process.
   *
   * @throws Will log an error message if the backup process fails at any step.
   */
  @Cron('0 */12 * * *')
  async backupDatabase(): Promise<void> {
    try {
      const { host, port, username, password, database } =
        await this.getDatabaseCredentials();

      if (
        ['localhost', '127.0.0.1', os.hostname()].includes(host) ||
        database !== 'pompeii'
      ) {
        this.logger.error(
          `Database backup is not supported when using a local database. (${JSON.stringify({ host, database })})`,
        );

        return;
      }
      const sqlFilePath = `/tmp/backup-${database.toLowerCase()}-${new Date().toISOString()}.sql`;

      await execPromise(
        `PGPASSWORD='${password}' pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p > ${sqlFilePath}`,
      );

      await this.uploadToS3(sqlFilePath);
      fs.unlinkSync(sqlFilePath);

      this.logger.log(
        'Database backup completed and uploaded to S3 successfully.',
      );
    } catch (error) {
      this.logger.error('Database backup failed:', error);
    }
  }

  /**
   * Retrieves the database credentials from AWS Secrets Manager.
   *
   * @returns {Promise<DatabaseCredentials>} A promise that resolves to the database credentials.
   * @throws {Error} If there is an issue retrieving or parsing the secret value.
   */
  private async getDatabaseCredentials(): Promise<DatabaseCredentials> {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);

      return {
        host: url.hostname,
        port: Number(url.port) || 5432,
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ''),
      };
    }

    if (process.env.USE_LOCAL_DATABASE === 'true') {
      return {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'pompeii',
      };
    }

    const command = new GetSecretValueCommand({
      SecretId: process.env.DB_CREDENTIALS,
    });
    const response = await this.secretsClient.send(command);
    return JSON.parse(response.SecretString!) as DatabaseCredentials;
  }

  /**
   * Uploads a file to an S3 bucket.
   *
   * @param filePath - The path to the file that needs to be uploaded.
   * @returns A promise that resolves when the upload is complete.
   *
   * @throws Will throw an error if the upload fails.
   */
  private async uploadToS3(filePath: string) {
    const fileStream = fs.createReadStream(filePath);
    const date = new Date();
    const key = `backups/${date.getUTCFullYear()}/${date.getMonth() + 1}/${date.toISOString()}.sql`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileStream,
    });

    await this.s3Client.send(command);
    this.logger.log(`Backup uploaded to S3 with key: ${key}`);
  }
}

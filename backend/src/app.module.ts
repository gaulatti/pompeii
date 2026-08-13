import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './authentication/authentication.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { RbacModule } from './authorization/rbac/rbac.module';
import { CloudWatchService } from './core/cloudwatch/cloudwatch.service';
import { CoreModule } from './core/core.module';
import { MetricsInterceptor } from './core/metrics/metrics.interceptor';
import { DalModule } from './dal/dal.module';
import { AccessLog } from './models/access.log.model';
import { Application } from './models/application.model';
import { Feature } from './models/feature.model';
import { Login } from './models/login.model';
import { Membership } from './models/membership.model';
import { Permission } from './models/permission.model';
import { Team } from './models/team.model';
import { User } from './models/user.model';
import { AdministrativeAuditLog } from './models/administrative-audit-log.model';
import { RbacPermission } from './models/rbac-permission.model';
import { RbacRole } from './models/rbac-role.model';
import { RoleAssignment } from './models/role-assignment.model';
import { RolePermission } from './models/role-permission.model';
/**
 * The AWS Secrets Manager client.
 */
const secretsManager = new SecretsManagerClient();

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), 'backend', '.env'),
        join(process.cwd(), '.env'),
        join(__dirname, '..', '.env'),
      ],
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const shouldUseSsl = configService.get('DB_SSL') === 'true';
        const defaultConfig: SequelizeModuleOptions = {
          dialect: 'postgres',
          port: +5432,
          models: [
            AccessLog,
            Application,
            Feature,
            Login,
            Membership,
            Permission,
            Team,
            User,
            AdministrativeAuditLog,
            RbacPermission,
            RbacRole,
            RoleAssignment,
            RolePermission,
          ],
          autoLoadModels: true,
          logging: configService.get('DB_LOGGING') === 'true',
          dialectOptions: shouldUseSsl
            ? {
                ssl: {
                  require: true,
                  rejectUnauthorized: false,
                },
              }
            : undefined,
        };

        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return {
            ...defaultConfig,
            uri: databaseUrl,
          };
        }

        if (configService.get('USE_LOCAL_DATABASE') === 'true') {
          return {
            ...defaultConfig,
            host: configService.get('DB_HOST'),
            port: +configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
          };
        }

        /**
         * Retrieve the secret from AWS Secrets Manager.
         */
        const secretResponse = await secretsManager.send(
          new GetSecretValueCommand({
            SecretId: configService.get('DB_CREDENTIALS'),
          }),
        );

        /**
         * If the secret response contains a secret string, parse it and return the database configuration.
         */
        if (secretResponse.SecretString) {
          const { host, port, username, password } = JSON.parse(
            secretResponse.SecretString,
          );

          const remoteConfig = {
            ...defaultConfig,
            host: host,
            port: +port,
            username,
            password,
            database: configService.get('DB_DATABASE'),
          };

          return {
            ...remoteConfig,
          };
        }

        throw new Error(
          'Failed to retrieve database credentials from AWS Secrets Manager.',
        );
      },
      inject: [ConfigService],
    }),
    CoreModule,
    DalModule,
    AuthorizationModule,
    AuthenticationModule,
    RbacModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CloudWatchService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}

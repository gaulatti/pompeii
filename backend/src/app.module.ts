import { Module } from '@nestjs/common';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './authentication/authentication.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { RbacModule } from './authorization/rbac/rbac.module';
import { CoreModule } from './core/core.module';
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
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
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
          logging: false,
          dialectOptions: isProduction
            ? {
                ssl: {
                  require: true,
                  rejectUnauthorized: false,
                },
              }
            : undefined,
        };

        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required');
        }

        return {
          ...defaultConfig,
          uri: databaseUrl,
        };
      },
    }),
    CoreModule,
    DalModule,
    AuthorizationModule,
    AuthenticationModule,
    RbacModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

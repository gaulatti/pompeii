import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AccessLog } from 'src/models/access.log.model';
import { Application } from 'src/models/application.model';
import { Feature } from 'src/models/feature.model';
import { Login } from 'src/models/login.model';
import { Membership } from 'src/models/membership.model';
import { Permission } from 'src/models/permission.model';
import { Team } from 'src/models/team.model';
import { User } from 'src/models/user.model';
import { AdministrativeAuditLog } from 'src/models/administrative-audit-log.model';
import { RbacPermission } from 'src/models/rbac-permission.model';
import { RbacRole } from 'src/models/rbac-role.model';
import { RoleAssignment } from 'src/models/role-assignment.model';
import { RolePermission } from 'src/models/role-permission.model';
import { BackupService } from './backup/backup.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
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
    ]),
  ],
  exports: [SequelizeModule],
  providers: [BackupService],
})
export class DalModule {}

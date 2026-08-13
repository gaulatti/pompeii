import { Global, Module } from '@nestjs/common';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { DalModule } from 'src/dal/dal.module';
import { AuditService } from './audit.service';
import { PermissionGuard } from './permission.guard';
import { RbacAdminController } from './rbac-admin.controller';
import { RbacService } from './rbac.service';
import { AuthorizationGrpcController } from './authorization-grpc.controller';

@Global()
@Module({
  imports: [DalModule, AuthenticationModule],
  controllers: [RbacAdminController, AuthorizationGrpcController],
  providers: [RbacService, AuditService, PermissionGuard],
  exports: [RbacService, AuditService, PermissionGuard],
})
export class RbacModule {}

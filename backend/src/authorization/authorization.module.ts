import { Module } from '@nestjs/common';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { DalModule } from 'src/dal/dal.module';
import { ApplicationsService } from './applications/applications.service';
import { AuthorizationController } from './authorization.controller';
import { AuthorizationService } from './authorization.service';
import { FeaturesService } from './features/features.service';
import { PermissionsService } from './permissions/permissions.service';

@Module({
  controllers: [AuthorizationController],
  providers: [
    ApplicationsService,
    AuthorizationService,
    FeaturesService,
    PermissionsService,
  ],
  imports: [DalModule, AuthenticationModule],
  exports: [ApplicationsService, FeaturesService, PermissionsService],
})
export class AuthorizationModule {}

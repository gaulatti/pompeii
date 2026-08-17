import { Module } from '@nestjs/common';
import { DalModule } from 'src/dal/dal.module';
import { UsersService } from './users/users.service';
import { TeamsService } from './teams/teams.service';
import { TokenVerifierService } from './token-verifier.service';
import { TestAuthController } from './test-auth.controller';

@Module({
  controllers: [TestAuthController],
  imports: [DalModule],
  providers: [TokenVerifierService, UsersService, TeamsService],
  exports: [TokenVerifierService, UsersService, TeamsService],
})
export class AuthenticationModule {}

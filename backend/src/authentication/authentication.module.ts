import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DalModule } from 'src/dal/dal.module';
import { AuthenticationStrategy } from './authentication.strategy';
import { UsersService } from './users/users.service';
import { TeamsService } from './teams/teams.service';
import { TokenVerifierService } from './token-verifier.service';

/**
 * The AuthenticationModule is responsible for handling authentication-related functionality.
 *
 * @module AuthenticationModule
 *
 * @imports
 * - DalModule: Data Access Layer module for database interactions.
 * - PassportModule: Passport module configured with JWT strategy for authentication.
 * - JwtModule: JWT module for handling JSON Web Tokens.
 *
 * @providers
 * - AuthenticationStrategy: Strategy for handling authentication logic.
 *
 * @exports
 * - AuthenticationStrategy: Exported to be used in other modules.
 */
@Module({
  imports: [
    DalModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  providers: [
    AuthenticationStrategy,
    TokenVerifierService,
    UsersService,
    TeamsService,
  ],
  exports: [
    AuthenticationStrategy,
    TokenVerifierService,
    UsersService,
    TeamsService,
  ],
})
export class AuthenticationModule {}

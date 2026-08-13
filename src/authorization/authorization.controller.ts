import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Public } from 'src/decorators/public.decorator';
import { TeamsService } from 'src/authentication/teams/teams.service';
import {
  GetFeaturesByApplicationRequest,
  GetFeaturesByApplicationResponse,
  UserContext,
  UserIdentity,
} from '../types/pompeii';
import { PermissionLevel } from 'src/utils/enums';
import { AuthorizationService } from './authorization.service';
import { FeaturesService } from './features/features.service';
import { PermissionsService } from './permissions/permissions.service';

/**
 * Controller responsible for handling authorization-related operations.
 */
@Controller('authorization')
export class AuthorizationController {
  /**
   * Initializes a new instance of the `AuthorizationController` class.
   *
   * @param authorizationService - The service used to handle authorization logic.
   * @param featuresService - The service used to manage features.
   */
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly featuresService: FeaturesService,
    private readonly teamsService: TeamsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Public()
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'pompeii-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('context/:key')
  async getContext(@Param('key') key: string, @Req() req: any): Promise<UserContext> {
    return this.authorizationService.buildUserContext({
      ...req.user,
      key,
    });
  }

  @Get('teams')
  async listTeams() {
    return this.teamsService.listTeams();
  }

  @Post('teams')
  async createTeam(@Body() body: { name: string; slug?: string }) {
    return this.teamsService.createTeam(body);
  }

  @Get('teams/:id/memberships')
  async listMemberships(@Param('id', ParseIntPipe) teamId: number) {
    return this.teamsService.listMembershipsForTeam(teamId);
  }

  @Post('memberships')
  async createMembership(
    @Body() body: { users_id: number; teams_id: number; role: number },
  ) {
    return this.teamsService.addMembership(body);
  }

  @Delete('memberships/:id')
  async deleteMembership(@Param('id', ParseIntPipe) id: number) {
    return {
      removed: await this.teamsService.removeMembership(id),
    };
  }

  @Post('permissions')
  async setPermission(
    @Body()
    body: {
      membership_id: number;
      feature_id: number;
      level: PermissionLevel;
    },
  ) {
    const valid = await this.permissionsService.validateMembershipAndFeature({
      membership_id: body.membership_id,
      feature_id: body.feature_id,
    });

    if (!valid) {
      return {
        error: 'Invalid membership_id or feature_id',
      };
    }

    return this.permissionsService.setPermission(body);
  }

  @Delete('permissions/:id')
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    return {
      removed: await this.permissionsService.removePermission(id),
    };
  }

  /**
   * Handles the gRPC method `GetFeaturesByApplication` for the `PompeiiService`.
   *
   * This method retrieves the features associated with a specific application.
   *
   * @param data - The request data containing the application details.
   * @returns A promise that resolves to the response containing the features of the application.
   */
  @GrpcMethod('PompeiiService', 'GetFeaturesByApplication')
  async getFeaturesByApplication(
    data: GetFeaturesByApplicationRequest,
  ): Promise<GetFeaturesByApplicationResponse> {
    const features = await this.featuresService.getFeaturesByApplication(data);

    return { features };
  }

  /**
   * Handles the login process by updating the user information and retrieving
   * the features associated with the specified application key.
   *
   * @param data - The login request data containing user credentials and application key.
   * @returns A promise that resolves to a `UserContext` object containing the updated user information
   *          and the features available for the specified application.
   */
  @GrpcMethod('PompeiiService', 'Login')
  async login(data: UserIdentity): Promise<UserContext> {
    return this.authorizationService.buildUserContext(data);
  }
}

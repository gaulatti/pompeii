import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  ForbiddenException,
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
import { ApplicationsService } from './applications/applications.service';
import { UsersService } from 'src/authentication/users/users.service';
import { AuditService } from './rbac/audit.service';
import { RequiresPermission } from './rbac/requires-permission.decorator';
import { RbacService } from './rbac/rbac.service';

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
    private readonly applicationsService: ApplicationsService,
    private readonly featuresService: FeaturesService,
    private readonly teamsService: TeamsService,
    private readonly permissionsService: PermissionsService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly rbacService: RbacService,
  ) {}

  @Get('users')
  @RequiresPermission('user:read', 'query.team_id')
  async listUsers(@Query('team_id') teamId?: number) {
    return this.usersService.listUsers(teamId ? Number(teamId) : undefined);
  }

  @Public()
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'pompeii-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('login/resolve')
  async resolveLoginRedirect(@Body() body: { returnTo?: string }) {
    if (typeof body.returnTo !== 'string' || !body.returnTo.trim()) {
      throw new BadRequestException('returnTo is required');
    }
    const redirectTo = await this.applicationsService.resolveLoginRedirect(
      body.returnTo.trim(),
    );
    if (!redirectTo) {
      throw new ForbiddenException('Login redirect is not registered');
    }
    return { redirect_to: redirectTo };
  }

  @Get('teams')
  async listTeams(@Req() req: any) {
    const userId = Number(req.user?.id);
    const globalDecision = await this.rbacService.authorizeUser(
      userId,
      'team:read',
      null,
    );
    if (globalDecision.allowed) return this.teamsService.listTeams();

    const teamIds = await this.rbacService.listAuthorizedTeamIds(
      userId,
      'team:read',
    );
    if (teamIds.length === 0) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        permission: 'team:read',
        reason: globalDecision.reason,
      });
    }
    return this.teamsService.listTeams(teamIds);
  }

  @Post('teams')
  @RequiresPermission('team:write')
  async createTeam(
    @Req() req: any,
    @Body() body: { name: string; slug?: string },
  ) {
    const team = await this.teamsService.createTeam(body);
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'team.create',
      targetType: 'team',
      targetId: String(team.id),
      metadata: body,
    });
    return team;
  }

  @Get('teams/:id/memberships')
  @RequiresPermission('team:read', 'params.id')
  async listMemberships(@Param('id', ParseIntPipe) teamId: number) {
    return this.teamsService.listMembershipsForTeam(teamId);
  }

  @Post('memberships')
  @RequiresPermission('team:write', 'body.teams_id')
  async createMembership(
    @Req() req: any,
    @Body() body: { users_id: number; teams_id: number; role: number },
  ) {
    const membership = await this.teamsService.addMembership(body);
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'membership.create',
      targetType: 'membership',
      targetId: String(membership.id),
      metadata: body,
    });
    return membership;
  }

  @Patch('memberships/:id')
  async updateMembership(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: number },
  ) {
    const existing = await this.teamsService.getMembership(id);
    if (!existing) throw new NotFoundException('Membership not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'team:write',
      existing.teams_id,
    );
    const membership = await this.teamsService.updateMembership(id, body.role);
    if (membership)
      await this.auditService.record({
        actorUserId: req.user.id,
        action: 'membership.update',
        targetType: 'membership',
        targetId: String(id),
        metadata: body,
      });
    return membership;
  }

  @Delete('memberships/:id')
  async deleteMembership(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const membership = await this.teamsService.getMembership(id);
    if (!membership) throw new NotFoundException('Membership not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'team:write',
      membership.teams_id,
    );
    const removed = await this.teamsService.removeMembership(id);
    if (removed)
      await this.auditService.record({
        actorUserId: req.user.id,
        action: 'membership.delete',
        targetType: 'membership',
        targetId: String(id),
      });
    return { removed };
  }

  @Get('applications')
  @RequiresPermission('application:read', 'query.team_id')
  async listApplications(@Query('team_id') teamId?: number) {
    if (teamId) {
      return this.applicationsService.listApplicationsByTeam(Number(teamId));
    }
    return this.applicationsService.listApplications();
  }

  @Get('applications/:id')
  async getApplication(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const application = await this.applicationsService.getById(id);
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:read',
      application.team_id,
    );
    return application;
  }

  @Post('applications')
  @RequiresPermission('application:write', 'body.team_id')
  async createApplication(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      slug?: string;
      team_id: number;
      description?: string;
      cognito_user_pool_id: string;
      cognito_client_id: string;
      login_redirect_origins?: string[];
      login_redirect_schemes?: string[];
    },
  ) {
    body.cognito_user_pool_id = body.cognito_user_pool_id?.trim();
    body.cognito_client_id = body.cognito_client_id?.trim();
    if (!body.cognito_user_pool_id || !body.cognito_client_id) {
      throw new BadRequestException(
        'cognito_user_pool_id and cognito_client_id are required',
      );
    }
    const application = await this.applicationsService.createApplication(body);
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'application.create',
      targetType: 'application',
      targetId: String(application.id),
      metadata: body,
    });
    return application;
  }

  @Patch('applications/:id')
  async updateApplication(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      cognito_user_pool_id?: string;
      cognito_client_id?: string;
      login_redirect_origins?: string[];
      login_redirect_schemes?: string[];
    },
  ) {
    const application = await this.applicationsService.getById(id);
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:write',
      application.team_id,
    );
    if (body.cognito_client_id !== undefined) {
      body.cognito_client_id = body.cognito_client_id.trim();
      if (!body.cognito_client_id) {
        throw new BadRequestException('cognito_client_id cannot be blank');
      }
    }
    if (body.cognito_user_pool_id !== undefined) {
      body.cognito_user_pool_id = body.cognito_user_pool_id.trim();
      if (!body.cognito_user_pool_id) {
        throw new BadRequestException('cognito_user_pool_id cannot be blank');
      }
    }
    const updated = await this.applicationsService.updateApplication(id, body);
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'application.update',
      targetType: 'application',
      targetId: String(id),
      metadata: body,
    });
    return updated;
  }

  @Get('applications/:id/features')
  async listFeatures(
    @Req() req: any,
    @Param('id', ParseIntPipe) applicationId: number,
  ) {
    const application = await this.applicationsService.getById(applicationId);
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:read',
      application.team_id,
    );
    return this.featuresService.getFeaturesByApplicationId(applicationId);
  }

  @Get('features/:id')
  async getFeature(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const feature = await this.featuresService.getFeatureById(id);
    if (!feature) throw new NotFoundException('Feature not found');
    const application = await this.applicationsService.getById(
      feature.application_id,
    );
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:read',
      application.team_id,
    );
    return feature;
  }

  @Patch('features/:id')
  async updateFeature(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      default_value?: PermissionLevel;
      description?: string;
    },
  ) {
    const feature = await this.featuresService.getFeatureById(id);
    if (!feature) throw new NotFoundException('Feature not found');
    const application = await this.applicationsService.getById(
      feature.application_id,
    );
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:write',
      application.team_id,
    );
    await this.featuresService.updateFeature(id, body);
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'feature.update',
      targetType: 'feature',
      targetId: String(id),
      metadata: body,
    });
    return this.featuresService.getFeatureById(id);
  }

  @Get('features/:id/permissions')
  async listPermissionsForFeature(
    @Req() req: any,
    @Param('id', ParseIntPipe) featureId: number,
  ) {
    const feature = await this.featuresService.getFeatureById(featureId);
    if (!feature) throw new NotFoundException('Feature not found');
    const application = await this.applicationsService.getById(
      feature.application_id,
    );
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:read',
      application.team_id,
    );
    return this.permissionsService.getPermissionsByFeatureId(featureId);
  }

  @Post('features')
  async createFeature(
    @Req() req: any,
    @Body()
    body: {
      application_id: number;
      name: string;
      slug: string;
      default_value: PermissionLevel;
      description?: string;
    },
  ) {
    const application = await this.applicationsService.getById(
      body.application_id,
    );
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:write',
      application.team_id,
    );
    const feature = await this.featuresService.createFeature(body);
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'feature.create',
      targetType: 'feature',
      targetId: String(feature.id),
      metadata: body,
    });
    return feature;
  }

  @Post('features/bulk')
  async bulkCreateFeatures(
    @Req() req: any,
    @Body()
    body: {
      application_id: number;
      features: Array<{
        name: string;
        slug?: string;
        default_value: PermissionLevel;
        description?: string;
      }>;
    },
  ) {
    const application = await this.applicationsService.getById(
      body.application_id,
    );
    if (!application) throw new NotFoundException('Application not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:write',
      application.team_id,
    );
    const features = await this.featuresService.bulkCreateFeatures(
      body.application_id,
      body.features,
    );
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'feature.bulk_create',
      targetType: 'application',
      targetId: String(body.application_id),
      metadata: { count: features.length },
    });
    return features;
  }

  @Post('permissions')
  async setPermission(
    @Req() req: any,
    @Body()
    body: {
      membership_id: number;
      feature_id: number;
      level: PermissionLevel;
    },
  ) {
    const membership = await this.teamsService.getMembership(
      body.membership_id,
    );
    if (!membership) throw new NotFoundException('Membership not found');
    const feature = await this.featuresService.getFeatureById(body.feature_id);
    if (!feature) throw new NotFoundException('Feature not found');
    const application = await this.applicationsService.getById(
      feature.application_id,
    );
    if (!application) throw new NotFoundException('Application not found');
    if (application.team_id !== membership.teams_id) {
      throw new BadRequestException(
        'Membership and feature must belong to the same team',
      );
    }
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:write',
      membership.teams_id,
    );
    const valid = await this.permissionsService.validateMembershipAndFeature({
      membership_id: body.membership_id,
      feature_id: body.feature_id,
    });

    if (!valid) {
      return {
        error: 'Invalid membership_id or feature_id',
      };
    }

    const permission = await this.permissionsService.setPermission(body);
    await this.auditService.record({
      actorUserId: req.user.id,
      action: 'feature_permission.set',
      targetType: 'feature-permission',
      targetId: String(permission.id),
      metadata: body,
    });
    return permission;
  }

  @Delete('permissions/:id')
  async deletePermission(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const permission = await this.permissionsService.getPermission(id);
    if (!permission)
      throw new NotFoundException('Feature permission not found');
    const membership = await this.teamsService.getMembership(
      permission.membership_id,
    );
    if (!membership) throw new NotFoundException('Membership not found');
    await this.rbacService.assertUserPermission(
      req.user.id,
      'application:write',
      membership.teams_id,
    );
    const removed = await this.permissionsService.removePermission(id);
    if (removed)
      await this.auditService.record({
        actorUserId: req.user.id,
        action: 'feature_permission.delete',
        targetType: 'feature-permission',
        targetId: String(id),
      });
    return { removed };
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

import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/authentication/users/users.service';
import { Application } from 'src/models/application.model';
import { Feature } from 'src/models/feature.model';
import { Membership } from 'src/models/membership.model';
import { UserContext, UserIdentity } from 'src/types/pompeii';
import { ApplicationsService } from './applications/applications.service';
import { FeaturesService } from './features/features.service';
import { PermissionsService } from './permissions/permissions.service';
import { type PermissionLevel } from 'src/utils/enums';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly applicationsService: ApplicationsService,
    private readonly featuresService: FeaturesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async buildUserContext(data: UserIdentity): Promise<UserContext> {
    const me = await this.usersService.updateUser(data);

    const application = await this.applicationsService.getBySlug(data.key);
    const features = await this.resolveFeaturesForUserAndApplication(
      me.id,
      application,
      data.key,
    );

    return {
      me: me as any,
      features,
    };
  }

  async resolveFeaturesForUserAndApplication(
    userId: number,
    application: Application | null,
    applicationSlug: string,
  ): Promise<Feature[]> {
    const defaults = await this.featuresService.getFeaturesByApplication({
      slug: applicationSlug,
    });

    if (!application) {
      return defaults;
    }

    const membership = await Membership.findOne({
      where: {
        users_id: userId,
        teams_id: application.team_id,
      },
    });

    if (!membership) {
      return defaults;
    }

    const overrides = await this.permissionsService.getMembershipPermissionMap(
      membership.id,
    );

    /**
     * Build a slug -> effective level map. Shorter slugs first so parents
     * resolve before children during the inheritance walk.
     */
    const slugs = [...defaults].sort(
      (a, b) => a.slug.split(':').length - b.slug.split(':').length,
    );

    const resolved = new Map<string, PermissionLevel>();

    for (const feature of slugs) {
      const direct = overrides.get(feature.id);

      if (direct) {
        resolved.set(feature.slug, direct);
        continue;
      }

      /**
       * Walk up the prefix chain to find the nearest parent with a
       * resolved value. e.g. for "manage:program:scenes" check
       * "manage:program" then "manage".
       */
      const parts = feature.slug.split(':');
      let inherited: PermissionLevel | undefined;

      for (let i = parts.length - 1; i > 0; i--) {
        const prefix = parts.slice(0, i).join(':');
        const parentLevel = resolved.get(prefix);
        if (parentLevel !== undefined) {
          inherited = parentLevel;
          break;
        }
      }

      resolved.set(feature.slug, inherited ?? feature.default_value);
    }

    return defaults.map((feature) => {
      const level = resolved.get(feature.slug);
      if (level && level !== feature.default_value) {
        feature.default_value = level;
      }
      return feature;
    });
  }
}

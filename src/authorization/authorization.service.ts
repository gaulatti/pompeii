import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/authentication/users/users.service';
import { Application } from 'src/models/application.model';
import { Feature } from 'src/models/feature.model';
import { Membership } from 'src/models/membership.model';
import { UserContext, UserIdentity } from 'src/types/pompeii';
import { ApplicationsService } from './applications/applications.service';
import { FeaturesService } from './features/features.service';
import { PermissionsService } from './permissions/permissions.service';

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

		return defaults.map((feature) => {
			const override = overrides.get(feature.id);

			if (!override) {
				return feature;
			}

			feature.default_value = override;
			return feature;
		});
	}
}

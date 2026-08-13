import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Feature } from 'src/models/feature.model';
import { Membership } from 'src/models/membership.model';
import { Permission } from 'src/models/permission.model';
import { PermissionLevel } from 'src/utils/enums';

@Injectable()
export class PermissionsService {
	constructor(
		@InjectModel(Permission) private readonly permission: typeof Permission,
		@InjectModel(Membership) private readonly membership: typeof Membership,
		@InjectModel(Feature) private readonly feature: typeof Feature,
	) {}

	async getMembershipPermissionMap(
		membershipId: number,
	): Promise<Map<number, PermissionLevel>> {
		const permissions = await this.permission.findAll({
			where: { membership_id: membershipId },
		});

		const map = new Map<number, PermissionLevel>();
		for (const item of permissions) {
			if (item.level) {
				map.set(item.feature_id, item.level);
			}
		}

		return map;
	}

	async setPermission(input: {
		membership_id: number;
		feature_id: number;
		level: PermissionLevel;
	}): Promise<Permission> {
		const existing = await this.permission.findOne({
			where: {
				membership_id: input.membership_id,
				feature_id: input.feature_id,
			},
		});

		if (existing) {
			return existing.update({ level: input.level });
		}

		return this.permission.create(input);
	}

	async removePermission(id: number): Promise<boolean> {
		const permission = await this.permission.findByPk(id);
		if (!permission) {
			return false;
		}
		await permission.destroy();
		return true;
	}

	async validateMembershipAndFeature(input: {
		membership_id: number;
		feature_id: number;
	}): Promise<boolean> {
		const [membership, feature] = await Promise.all([
			this.membership.findByPk(input.membership_id),
			this.feature.findByPk(input.feature_id),
		]);

		return Boolean(membership && feature);
	}
}

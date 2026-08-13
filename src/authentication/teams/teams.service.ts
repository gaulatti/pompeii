import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Membership } from 'src/models/membership.model';
import { Team } from 'src/models/team.model';
import { nanoid } from 'src/utils/nanoid';

@Injectable()
export class TeamsService {
	constructor(
		@InjectModel(Team) private readonly team: typeof Team,
		@InjectModel(Membership) private readonly membership: typeof Membership,
	) {}

	async listTeams(): Promise<Team[]> {
		return this.team.findAll();
	}

	async createTeam(input: { name: string; slug?: string }): Promise<Team> {
		return this.team.create({
			name: input.name,
			slug: input.slug || nanoid(),
		});
	}

	async addMembership(input: {
		users_id: number;
		teams_id: number;
		role: number;
	}): Promise<Membership> {
		return this.membership.create(input);
	}

	async listMembershipsForTeam(teamId: number): Promise<Membership[]> {
		return this.membership.findAll({ where: { teams_id: teamId } });
	}

	async removeMembership(id: number): Promise<boolean> {
		const membership = await this.membership.findByPk(id);
		if (!membership) {
			return false;
		}
		await membership.destroy();
		return true;
	}
}

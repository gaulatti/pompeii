import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Membership } from 'src/models/membership.model';
import { Team } from 'src/models/team.model';
import { User } from 'src/models/user.model';
import { nanoid } from 'src/utils/nanoid';
import { Op } from 'sequelize';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team) private readonly team: typeof Team,
    @InjectModel(Membership) private readonly membership: typeof Membership,
  ) {}

  async listTeams(teamIds?: number[]): Promise<Team[]> {
    if (teamIds && teamIds.length === 0) return [];
    return this.team.findAll({
      where: teamIds ? { id: { [Op.in]: teamIds } } : undefined,
      order: [['name', 'ASC']],
    });
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
    if (Number(input.role) === 1) {
      const existingOwner = await this.membership.findOne({
        where: { teams_id: input.teams_id, role: 1 },
      });
      if (existingOwner) {
        throw new BadRequestException('This team already has an owner.');
      }
    }
    return this.membership.create(input);
  }

  async listMembershipsForTeam(teamId: number): Promise<Membership[]> {
    return this.membership.findAll({
      where: { teams_id: teamId },
      include: [User],
    });
  }

  async getMembership(id: number): Promise<Membership | null> {
    return this.membership.findByPk(id);
  }

  async updateMembership(id: number, role: number): Promise<Membership | null> {
    const membership = await this.membership.findByPk(id);
    if (!membership) {
      return null;
    }

    if (Number(role) === 1 && membership.role !== 1) {
      const existingOwner = await this.membership.findOne({
        where: { teams_id: membership.teams_id, role: 1 },
      });
      if (existingOwner && existingOwner.id !== membership.id) {
        throw new BadRequestException('This team already has an owner.');
      }
    }

    membership.role = role;
    return membership.save();
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

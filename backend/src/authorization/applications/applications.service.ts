import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Logger } from 'src/decorators/logger.decorator';
import { Application } from 'src/models/application.model';
import { JSONLogger } from 'src/utils/logger';
import { nanoid } from 'src/utils/nanoid';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application) private readonly application: typeof Application,
  ) {}

  @Logger(ApplicationsService.name)
  private readonly logger!: JSONLogger;

  async getBySlug(slug: string) {
    return this.application.findOne({ where: { slug } });
  }

  async getById(id: number) {
    return this.application.findByPk(id);
  }

  async listApplications() {
    return this.application.findAll();
  }

  async listApplicationsByTeam(teamId: number) {
    return this.application.findAll({ where: { team_id: teamId } });
  }

  async createApplication(input: {
    name: string;
    slug?: string;
    team_id: number;
    description?: string;
  }) {
    return this.application.create({
      ...input,
      slug: input.slug || nanoid(),
    });
  }
}

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

  getBySlug(slug: string) {
    return this.application.findOne({ where: { slug } });
  }

  getById(id: number) {
    return this.application.findByPk(id);
  }

  listApplications() {
    return this.application.findAll();
  }

  listApplicationsByTeam(teamId: number) {
    return this.application.findAll({ where: { team_id: teamId } });
  }

  createApplication(input: {
    name: string;
    slug?: string;
    team_id: number;
    description?: string;
    cognito_user_pool_id: string;
    cognito_client_id: string;
  }) {
    return this.application.create({
      name: input.name,
      slug: input.slug || nanoid(),
      team_id: input.team_id,
      description: input.description,
      cognito_user_pool_id: input.cognito_user_pool_id,
      cognito_client_id: input.cognito_client_id,
    });
  }

  async updateApplication(
    id: number,
    input: {
      name?: string;
      description?: string;
      cognito_user_pool_id?: string;
      cognito_client_id?: string;
    },
  ) {
    const application = await this.application.findByPk(id);
    if (!application) return null;
    return application.update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.cognito_user_pool_id !== undefined
        ? { cognito_user_pool_id: input.cognito_user_pool_id }
        : {}),
      ...(input.cognito_client_id !== undefined
        ? { cognito_client_id: input.cognito_client_id }
        : {}),
    });
  }
}

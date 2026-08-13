import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Logger } from 'src/decorators/logger.decorator';
import { Feature } from 'src/models/feature.model';
import { GetFeaturesByApplicationRequest } from 'src/types/pompeii';
import { PermissionLevel } from 'src/utils/enums';
import { JSONLogger } from 'src/utils/logger';
import { ApplicationsService } from '../applications/applications.service';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectModel(Feature) private readonly feature: typeof Feature,
    private readonly applicationsService: ApplicationsService,
  ) {}

  /**
   * Logger instance for logging messages.
   */
  @Logger(FeaturesService.name)
  private readonly logger!: JSONLogger;

  /**
   * Retrieves a list of features associated with a specific application
   * identified by its slug.
   *
   * @param request - An object containing the slug of the application for which
   *                  features are being requested.
   * @returns A promise that resolves to an array of features. If the application
   *          does not exist, an empty array is returned.
   *
   * @throws Logs an error if the application with the specified slug does not exist.
   */
  async getFeaturesByApplication(
    request: GetFeaturesByApplicationRequest,
  ): Promise<Feature[]> {
    const application = await this.applicationsService.getBySlug(request.slug);

    if (!application) {
      this.logger.error(
        `Requesting features for non-existing application. Slug: ${request.slug}`,
      );
      return [];
    }

    return this.feature.findAll({
      where: { application_id: application.id },
    });
  }

  async getFeatureById(id: number): Promise<Feature | null> {
    return this.feature.findByPk(id);
  }

  async getFeaturesByApplicationId(applicationId: number): Promise<Feature[]> {
    return this.feature.findAll({
      where: { application_id: applicationId },
    });
  }

  async createFeature(input: {
    application_id: number;
    name: string;
    slug?: string;
    default_value: PermissionLevel;
    description?: string;
  }): Promise<Feature> {
    const slug =
      input.slug ||
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    return this.feature.create({ ...input, slug });
  }

  async bulkCreateFeatures(
    applicationId: number,
    features: Array<{
      name: string;
      slug?: string;
      default_value: PermissionLevel;
      description?: string;
    }>,
  ): Promise<Feature[]> {
    const created: Feature[] = [];

    for (const input of features) {
      const feature = await this.createFeature({
        application_id: applicationId,
        ...input,
      });
      created.push(feature);
    }

    return created;
  }

  async updateFeature(
    id: number,
    input: {
      name?: string;
      default_value?: PermissionLevel;
      description?: string;
    },
  ): Promise<void> {
    await this.feature.update(input, { where: { id } });
  }
}

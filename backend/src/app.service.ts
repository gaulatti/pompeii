import { Injectable } from '@nestjs/common';
import { ApplicationsService } from './authorization/applications/applications.service';
import { FeaturesService } from './authorization/features/features.service';

@Injectable()
export class AppService {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly featuresService: FeaturesService,
  ) {}

  async kickoff(user: any) {
    const pompeiiApp = await this.applicationsService.getBySlug('pompeii');
    const features = pompeiiApp
      ? await this.featuresService.getFeaturesByApplicationId(pompeiiApp.id)
      : [];

    return {
      features,
      enums: [],
      me: user,
    };
  }
}

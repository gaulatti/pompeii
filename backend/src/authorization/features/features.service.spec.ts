import { Test, TestingModule } from '@nestjs/testing';
import { FeaturesService } from './features.service';
import { getModelToken } from '@nestjs/sequelize';
import { Feature } from 'src/models/feature.model';
import { ApplicationsService } from '../applications/applications.service';

describe('FeaturesService', () => {
  let service: FeaturesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesService,
        { provide: getModelToken(Feature), useValue: {} },
        { provide: ApplicationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

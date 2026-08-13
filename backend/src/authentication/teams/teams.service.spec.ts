import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { getModelToken } from '@nestjs/sequelize';
import { Team } from 'src/models/team.model';
import { Membership } from 'src/models/membership.model';

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getModelToken(Team), useValue: {} },
        { provide: getModelToken(Membership), useValue: {} },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

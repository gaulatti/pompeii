import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { getModelToken } from '@nestjs/sequelize';
import { Permission } from 'src/models/permission.model';
import { Membership } from 'src/models/membership.model';
import { Feature } from 'src/models/feature.model';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: getModelToken(Permission), useValue: {} },
        { provide: getModelToken(Membership), useValue: {} },
        { provide: getModelToken(Feature), useValue: {} },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

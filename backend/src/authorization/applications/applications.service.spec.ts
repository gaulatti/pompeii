import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { Application } from 'src/models/application.model';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  const applicationModel = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getModelToken(Application), useValue: applicationModel },
      ],
    }).compile();

    service = module.get(ApplicationsService);
    jest.clearAllMocks();
  });

  it('creates an application with its Cognito identity registration', async () => {
    applicationModel.create.mockResolvedValue({ id: 1 });
    const input = {
      name: 'Celesti',
      slug: 'celesti',
      team_id: 1,
      cognito_user_pool_id: 'us-east-1_pool',
      cognito_client_id: 'client',
    };

    await service.createApplication(input);

    expect(applicationModel.create).toHaveBeenCalledWith(input);
  });
});

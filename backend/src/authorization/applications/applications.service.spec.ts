import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { getModelToken } from '@nestjs/sequelize';
import { Application } from 'src/models/application.model';

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

    service = module.get<ApplicationsService>(ApplicationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('normalizes redirect configuration when creating an application', async () => {
    applicationModel.create.mockResolvedValue({ id: 1 });

    await service.createApplication({
      name: 'Celesti',
      slug: 'celesti',
      team_id: 1,
      cognito_user_pool_id: 'us-east-1_pool',
      cognito_client_id: 'client',
      login_redirect_origins: [
        'https://celesti.example/path',
        'https://celesti.example',
      ],
      login_redirect_schemes: ['Celesti:', 'celesti'],
    });

    expect(applicationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        login_redirect_origins: ['https://celesti.example'],
        login_redirect_schemes: ['celesti'],
      }),
    );
  });

  it.each([
    ['https://angelina.example/dashboard', 'https://angelina.example'],
    ['http://localhost:5173/dashboard', 'http://localhost:5173'],
  ])('resolves a registered web redirect for %s', async (returnTo, origin) => {
    applicationModel.findAll.mockResolvedValue([
      {
        login_redirect_origins: [origin],
        login_redirect_schemes: [],
      },
    ]);

    await expect(service.resolveLoginRedirect(returnTo)).resolves.toBe(
      `${origin}/login?pompeii_sso=1&returnTo=%2Fdashboard`,
    );
  });

  it('resolves a registered native redirect scheme', async () => {
    applicationModel.findAll.mockResolvedValue([
      {
        login_redirect_origins: [],
        login_redirect_schemes: ['celesti'],
      },
    ]);

    await expect(
      service.resolveLoginRedirect('celesti://pompeii-auth'),
    ).resolves.toBe('celesti://pompeii-auth?pompeii_sso=1');
  });

  it('denies an unregistered redirect', async () => {
    applicationModel.findAll.mockResolvedValue([
      {
        login_redirect_origins: ['https://angelina.example'],
        login_redirect_schemes: ['celesti'],
      },
    ]);

    await expect(
      service.resolveLoginRedirect('https://attacker.example/login'),
    ).resolves.toBeNull();
    await expect(
      service.resolveLoginRedirect('javascript:alert(1)'),
    ).resolves.toBeNull();
  });

  it('denies browser-executable schemes even if present in the database', async () => {
    applicationModel.findAll.mockResolvedValue([
      {
        login_redirect_origins: [],
        login_redirect_schemes: ['javascript'],
      },
    ]);

    await expect(
      service.resolveLoginRedirect('javascript:alert(1)'),
    ).resolves.toBeNull();
  });

  it('rejects credentials in redirect URLs', async () => {
    await expect(
      service.resolveLoginRedirect('https://user:pass@angelina.example'),
    ).rejects.toThrow('redirect URLs cannot contain credentials');
  });
});

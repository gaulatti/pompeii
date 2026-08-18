import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/sequelize';
import { User } from 'src/models/user.model';
import { AccessLog } from 'src/models/access.log.model';
import { Login } from 'src/models/login.model';
import { Op } from 'sequelize';
import { RbacRole } from 'src/models/rbac-role.model';
import { RoleAssignment } from 'src/models/role-assignment.model';
import { Team } from 'src/models/team.model';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User), useValue: {} },
        { provide: getModelToken(AccessLog), useValue: {} },
        { provide: getModelToken(Login), useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists the complete identity directory without requiring legacy membership', async () => {
    const userModel = (service as any).user;
    userModel.findAll = jest.fn().mockResolvedValue([]);

    await service.listUsers();

    expect(userModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: [
          expect.objectContaining({
            model: RoleAssignment,
            include: [RbacRole, Team],
          }),
        ],
      }),
    );
  });

  it('includes global and selected-team RBAC assignments in a team scope', async () => {
    const userModel = (service as any).user;
    userModel.findAll = jest.fn().mockResolvedValue([]);

    await service.listUsers(7);

    const options = userModel.findAll.mock.calls[0][0];
    expect(options.include[0]).toEqual(
      expect.objectContaining({
        model: RoleAssignment,
        required: true,
      }),
    );
    expect(options.include[0].where).toEqual(
      expect.objectContaining({ [Op.or]: [{ team_id: 7 }, { team_id: null }] }),
    );
  });

  it('provisions a verified authorization identity without assigning access', async () => {
    jest.spyOn(service, 'getUser').mockResolvedValue(null);
    const created = { id: 17 } as User;
    const userModel = (service as any).user;
    userModel.findOne = jest.fn().mockResolvedValue(null);
    userModel.create = jest.fn().mockResolvedValue(created);
    const loginModel = (service as any).login;
    loginModel.create = jest.fn().mockResolvedValue({});

    await expect(
      service.resolveAuthorizationUser({
        sub: 'subject-17',
        email: 'subject-17@example.com',
        email_verified: true,
        name: 'Jordan Example',
      }),
    ).resolves.toMatchObject({ id: 17 });

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'subject-17@example.com',
        name: 'Jordan',
        last_name: 'Example',
      }),
    );
    expect(loginModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 17, sub: 'subject-17' }),
    );
  });

  it('does not provision an identity that lacks a verified email claim', async () => {
    jest.spyOn(service, 'getUser').mockResolvedValue(null);
    const userModel = (service as any).user;
    userModel.create = jest.fn();

    await expect(
      service.resolveAuthorizationUser({ sub: 'subject-without-email' }),
    ).resolves.toBeNull();
    await expect(
      service.resolveAuthorizationUser({
        sub: 'subject-unverified',
        email: 'unverified@example.com',
        email_verified: false,
      }),
    ).resolves.toBeNull();
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('does not link a first-use subject to an existing email owner', async () => {
    jest.spyOn(service, 'getUser').mockResolvedValue(null);
    const userModel = (service as any).user;
    userModel.findOne = jest.fn().mockResolvedValue({ id: 99 });
    userModel.create = jest.fn();

    await expect(
      service.resolveAuthorizationUser({
        sub: 'new-subject',
        email: 'admin@example.com',
        email_verified: true,
      }),
    ).resolves.toBeNull();
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('requires a verified email when the REST identity is first seen', async () => {
    jest.spyOn(service, 'getUser').mockResolvedValue(null);
    const userModel = (service as any).user;
    userModel.findOne = jest.fn();
    userModel.create = jest.fn();

    await expect(
      service.updateUser({
        sub: 'rest-subject',
        email: 'rest@example.com',
        email_verified: false,
      }),
    ).rejects.toThrow('A verified email is required');
    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('does not link a new REST subject to an existing email owner', async () => {
    jest.spyOn(service, 'getUser').mockResolvedValue(null);
    const userModel = (service as any).user;
    userModel.findOne = jest.fn().mockResolvedValue({ id: 99 });
    userModel.create = jest.fn();

    await expect(
      service.updateUser({
        sub: 'new-rest-subject',
        email: 'admin@example.com',
        email_verified: true,
      }),
    ).rejects.toThrow('already linked');
    expect(userModel.create).not.toHaveBeenCalled();
  });
});

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { AccessLog } from 'src/models/access.log.model';
import { Login } from 'src/models/login.model';
import { Membership } from 'src/models/membership.model';
import { Permission } from 'src/models/permission.model';
import { RbacRole } from 'src/models/rbac-role.model';
import { RoleAssignment } from 'src/models/role-assignment.model';
import { Team } from 'src/models/team.model';
import { User } from 'src/models/user.model';
import { nanoid } from 'src/utils/nanoid';

type VerifiedAuthorizationIdentity = {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
  identities?: { providerName?: string }[];
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(AccessLog) private readonly accessLog: typeof AccessLog,
    @InjectModel(Login) private readonly login: typeof Login,
  ) {}

  /**
   * Retrieves all users.
   *
   * @returns {Promise<User[]>} A promise that resolves to an array of all users.
   */
  async listUsers(teamId?: number): Promise<User[]> {
    return this.user.findAll({
      include: [
        {
          model: RoleAssignment,
          include: [RbacRole, Team],
          ...(teamId
            ? {
                required: true,
                where: {
                  [Op.or]: [{ team_id: teamId }, { team_id: null }],
                },
              }
            : {}),
        },
      ],
      order: [
        ['name', 'ASC'],
        ['last_name', 'ASC'],
      ],
    });
  }

  /**
   * Retrieves a user by their subject identifier (sub).
   *
   * @param {string} sub - The subject identifier of the user.
   * @returns {Promise<User>} A promise that resolves to the user object.
   */
  async getUser(sub: string): Promise<User | null> {
    return await this.user.findOne({
      include: [
        {
          model: Login,
          where: { sub },
          required: true,
        },
      ],
    });
  }

  /**
   * Registers a verified client-service identity in Pompeii on first use.
   * Provisioning never grants a role, so a new identity remains denied until
   * an administrator assigns its access in the Pompeii governance surface.
   */
  async resolveAuthorizationUser(
    identity: VerifiedAuthorizationIdentity,
  ): Promise<User | null> {
    const existing = await this.getUser(identity.sub);
    if (existing) return existing;
    if (
      !identity.email ||
      !(identity.email_verified === true || identity.email_verified === 'true')
    )
      return null;

    // Authorization traffic must never implicitly link a new Cognito subject
    // to an existing privileged account merely because its email collides.
    // Account linking is an explicit administrative action.
    const existingEmailOwner = await this.user.findOne({
      where: { email: identity.email },
    });
    if (existingEmailOwner) return null;

    const [givenName, ...remainingName] = (identity.name ?? '')
      .trim()
      .split(/\s+/);

    let createdUser: User | null = null;
    try {
      createdUser = await this.user.create({
        email: identity.email,
        name: identity.given_name || givenName || 'Unknown',
        last_name: identity.family_name || remainingName.join(' ') || 'Unknown',
        slug: nanoid(),
      });
      await this.login.create({
        user_id: createdUser.id,
        provider:
          identity.identities?.find(
            (item) => typeof item.providerName === 'string',
          )?.providerName ?? 'cognito',
        sub: identity.sub,
      });
      return createdUser;
    } catch {
      // Avoid leaving a shadow user if login creation loses a subject race.
      if (createdUser)
        await createdUser.destroy({ force: true }).catch(() => {});
      // A concurrent request may have provisioned this exact subject. Only a
      // subject lookup—not an email lookup—is allowed to recover the identity.
      return this.getUser(identity.sub);
    }
  }

  /**
   * Finds a user by their ID.
   *
   * @param {number} id - The ID of the user to find.
   * @returns {Promise<User>} A promise that resolves to the user with the specified ID.
   */
  async findUser(id: number): Promise<User | null> {
    return await this.user.findOne({ where: { id }, include: [Membership] });
  }

  async setActive(id: number, isActive: boolean): Promise<User> {
    const user = await this.user.findByPk(id);
    if (!user) throw new NotFoundException('User not found');
    return user.update({ is_active: isActive });
  }

  /**
   * Updates or creates a user based on the provided payload. If the user does not exist,
   * it attempts to find the user by email or creates a new user. It also ensures that
   * the user's name, last name, and email are updated if missing. Additionally, it logs
   * the user's access and manages login information.
   *
   * @param payload - The user data used for updating or creating a user.
   * @param payload.sub - The unique identifier for the user (subject).
   * @param payload.given_name - The given name (first name) of the user.
   * @param payload.family_name - The family name (last name) of the user.
   * @param payload.email - The email address of the user.
   * @param payload.provider - (Optional) The authentication provider for the user.
   * @param payload.identities - An array of identity objects containing provider information.
   * @param payload.identities[].providerName - The name of the authentication provider.
   *
   * @returns A promise that resolves to the updated or newly created user.
   */
  async updateUser(payload: {
    sub: string;
    given_name?: string;
    family_name?: string;
    email: string;
    email_verified?: boolean | string;
    provider?: string;
    identities?: { providerName: string }[];
  }): Promise<User> {
    const {
      sub,
      given_name,
      family_name,
      email,
      email_verified,
      identities,
      provider: payloadProvider,
    } = payload;

    const name = given_name || 'Unknown';
    const safeLastName = family_name || 'Unknown';

    const provider = payloadProvider || identities?.find(Boolean)?.providerName;
    let user = await this.getUser(sub);

    if (!user) {
      if (!(email_verified === true || email_verified === 'true')) {
        throw new UnauthorizedException('A verified email is required');
      }

      // A matching email is not proof that a new subject owns an existing
      // account. Cross-provider linking must be performed administratively.
      const existingEmailOwner = await this.user.findOne({ where: { email } });
      if (existingEmailOwner) {
        throw new UnauthorizedException(
          'This email is already linked to another identity',
        );
      }

      user = await this.user.create({
        name,
        last_name: safeLastName,
        email,
        slug: nanoid(),
      });

      /**
       * Attach the provider to the account.
       */
      await this.login.create({
        user_id: user.id,
        provider: provider || 'unknown',
        sub,
      });
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User is inactive');
    }

    /**
     * Update its details if they're not present.
     */
    let updatedUser = user;
    if (!user.name || !user.last_name || !user.email) {
      updatedUser = await user.update({
        name: user.name || name,
        last_name: user.last_name || safeLastName,
        email: user.email || email,
      });
    }

    updatedUser = await updatedUser.update({ last_seen_at: new Date() });

    /**
     * Create an access log.
     */
    await this.accessLog.create({
      user_id: updatedUser.id,
      timestamp: new Date(),
    });

    /**
     * Reload the user for delivery purposes.
     */
    await updatedUser.reload({
      include: [
        {
          model: Membership,
          include: [{ model: Permission }, { model: Team }],
        },
        {
          model: RoleAssignment,
          include: [{ model: RbacRole }, { model: Team }],
        },
      ],
    });

    return updatedUser;
  }
}

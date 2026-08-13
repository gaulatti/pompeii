import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AccessLog } from 'src/models/access.log.model';
import { Login } from 'src/models/login.model';
import { Membership } from 'src/models/membership.model';
import { Permission } from 'src/models/permission.model';
import { Team } from 'src/models/team.model';
import { User } from 'src/models/user.model';
import { nanoid } from 'src/utils/nanoid';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(AccessLog) private readonly accessLog: typeof AccessLog,
    @InjectModel(Login) private readonly login: typeof Login,
  ) {}

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
   * Finds a user by their ID.
   *
   * @param {number} id - The ID of the user to find.
   * @returns {Promise<User>} A promise that resolves to the user with the specified ID.
   */
  async findUser(id: number): Promise<User | null> {
    return await this.user.findOne({ where: { id }, include: [Membership] });
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
    provider?: string;
    identities?: { providerName: string }[];
  }): Promise<User> {
    const {
      sub,
      given_name,
      family_name,
      email,
      identities,
      provider: payloadProvider,
    } = payload;

    const name = given_name || 'Unknown';
    const safeLastName = family_name || 'Unknown';

    const provider = payloadProvider || identities?.find(Boolean)?.providerName;
    let user = await this.getUser(sub);

    if (!user) {
      /**
       * If User is not found by the current provider, try to find it by mail.
       */
      user = await this.user.findOne({ where: { email } });

      if (!user) {
        /**
         * If there's no user at all, create it.
         */
        user = await this.user.create({
          name,
          last_name: safeLastName,
          email,
          slug: nanoid(),
        });
      }

      /**
       * Attach the provider to the account.
       */
      await this.login.create({
        user_id: user.id,
        provider: provider || 'unknown',
        sub,
      });
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
      ],
    });

    return updatedUser;
  }
}

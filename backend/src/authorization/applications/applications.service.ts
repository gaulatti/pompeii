import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Logger } from 'src/decorators/logger.decorator';
import { Application } from 'src/models/application.model';
import { JSONLogger } from 'src/utils/logger';
import { nanoid } from 'src/utils/nanoid';

const BLOCKED_REDIRECT_SCHEMES = new Set([
  'about',
  'blob',
  'data',
  'file',
  'javascript',
  'vbscript',
]);

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application) private readonly application: typeof Application,
  ) {}

  @Logger(ApplicationsService.name)
  private readonly logger!: JSONLogger;

  async getBySlug(slug: string) {
    return this.application.findOne({ where: { slug } });
  }

  async getById(id: number) {
    return this.application.findByPk(id);
  }

  async listApplications() {
    return this.application.findAll();
  }

  async listApplicationsByTeam(teamId: number) {
    return this.application.findAll({ where: { team_id: teamId } });
  }

  async createApplication(input: {
    name: string;
    slug?: string;
    team_id: number;
    description?: string;
    cognito_user_pool_id: string;
    cognito_client_id: string;
    login_redirect_origins?: string[];
    login_redirect_schemes?: string[];
  }) {
    const redirects = this.normalizeLoginRedirects(input);
    return this.application.create({
      name: input.name,
      slug: input.slug || nanoid(),
      team_id: input.team_id,
      description: input.description,
      cognito_user_pool_id: input.cognito_user_pool_id,
      cognito_client_id: input.cognito_client_id,
      login_redirect_origins: redirects.login_redirect_origins ?? [],
      login_redirect_schemes: redirects.login_redirect_schemes ?? [],
    });
  }

  async updateApplication(
    id: number,
    input: {
      name?: string;
      description?: string;
      cognito_user_pool_id?: string;
      cognito_client_id?: string;
      login_redirect_origins?: string[];
      login_redirect_schemes?: string[];
    },
  ) {
    const application = await this.application.findByPk(id);
    if (!application) return null;
    const redirects = this.normalizeLoginRedirects(input);
    return application.update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.cognito_user_pool_id !== undefined
        ? { cognito_user_pool_id: input.cognito_user_pool_id }
        : {}),
      ...(input.cognito_client_id !== undefined
        ? { cognito_client_id: input.cognito_client_id }
        : {}),
      ...redirects,
    });
  }

  async resolveLoginRedirect(returnTo: string): Promise<string | null> {
    const target = this.parseRedirectTarget(returnTo);
    const applications = await this.application.findAll({
      attributes: ['login_redirect_origins', 'login_redirect_schemes'],
    });
    const protocol = target.protocol.toLowerCase();
    const allowed = applications.some((application) => {
      if (protocol === 'http:' || protocol === 'https:') {
        return (application.login_redirect_origins ?? []).includes(
          target.origin,
        );
      }
      const scheme = protocol.slice(0, -1);
      return (
        !BLOCKED_REDIRECT_SCHEMES.has(scheme) &&
        (application.login_redirect_schemes ?? []).includes(scheme)
      );
    });
    if (!allowed) return null;

    if (protocol !== 'http:' && protocol !== 'https:') {
      target.searchParams.set('pompeii_sso', '1');
      return target.toString();
    }

    const handoff = new URL('/login', target.origin);
    handoff.searchParams.set('pompeii_sso', '1');
    handoff.searchParams.set(
      'returnTo',
      target.pathname === '/login'
        ? '/'
        : `${target.pathname}${target.search}${target.hash}`,
    );
    return handoff.toString();
  }

  private normalizeLoginRedirects(input: {
    login_redirect_origins?: string[];
    login_redirect_schemes?: string[];
  }): {
    login_redirect_origins?: string[];
    login_redirect_schemes?: string[];
  } {
    const normalized: {
      login_redirect_origins?: string[];
      login_redirect_schemes?: string[];
    } = {};

    if (input.login_redirect_origins !== undefined) {
      if (!Array.isArray(input.login_redirect_origins)) {
        throw new BadRequestException(
          'login_redirect_origins must be an array',
        );
      }
      normalized.login_redirect_origins = [
        ...new Set(
          input.login_redirect_origins.map((value) => {
            if (typeof value !== 'string') {
              throw new BadRequestException(
                'login_redirect_origins must contain strings',
              );
            }
            const target = this.parseRedirectTarget(value.trim());
            if (!['http:', 'https:'].includes(target.protocol)) {
              throw new BadRequestException(
                'login_redirect_origins must use http or https',
              );
            }
            return target.origin;
          }),
        ),
      ];
    }

    if (input.login_redirect_schemes !== undefined) {
      if (!Array.isArray(input.login_redirect_schemes)) {
        throw new BadRequestException(
          'login_redirect_schemes must be an array',
        );
      }
      normalized.login_redirect_schemes = [
        ...new Set(
          input.login_redirect_schemes.map((value) => {
            if (typeof value !== 'string') {
              throw new BadRequestException(
                'login_redirect_schemes must contain strings',
              );
            }
            const scheme = value.trim().toLowerCase().replace(/:$/, '');
            if (
              !/^[a-z][a-z0-9+.-]*$/.test(scheme) ||
              scheme === 'http' ||
              scheme === 'https' ||
              BLOCKED_REDIRECT_SCHEMES.has(scheme)
            ) {
              throw new BadRequestException(
                'login_redirect_schemes contains an invalid custom scheme',
              );
            }
            return scheme;
          }),
        ),
      ];
    }

    return normalized;
  }

  private parseRedirectTarget(value: string): URL {
    let target: URL;
    try {
      target = new URL(value);
    } catch {
      throw new BadRequestException('returnTo must be an absolute URL');
    }
    if (target.username || target.password) {
      throw new BadRequestException('redirect URLs cannot contain credentials');
    }
    return target;
  }
}

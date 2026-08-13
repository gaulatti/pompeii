import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';

/**
 * AuthenticationGuard is a custom guard that extends the default JWT AuthGuard.
 * It determines whether the current request is authorized to proceed based on the presence of an authorization token
 * or whether the route is marked as public.
 *
 * @class
 * @extends AuthGuard
 * @constructor
 * @param {Reflector} reflector - An instance of the Reflector class used to access metadata.
 *
 * @method canActivate
 * @memberof AuthenticationGuard
 * @param {ExecutionContext} context - The execution context which provides details about the current request.
 * @returns {boolean} - A boolean indicating whether the request is authorized.
 *
 * The canActivate method performs the following checks:
 * 1. If an authorization token is present in the request headers, it delegates the authorization check to the parent class.
 * 2. If no authorization token is present, it checks if the route is marked as public. If the route is public, access is granted; otherwise, access is denied.
 */
@Injectable()
export class AuthenticationGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determines whether the current request is authorized to proceed.
   *
   * @param context - The execution context which provides details about the current request.
   * @returns A boolean indicating whether the request is authorized.
   *
   * The method performs the following checks:
   * 1. If an authorization token is present in the request headers, it delegates the authorization check to the parent class.
   * 2. If no authorization token is present, it checks if the route is marked as public. If the route is public, access is granted; otherwise, access is denied.
   */
  canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    /**
     * If there's a token, validate it as a normal user.
     */
    if (authHeader) {
      return super.canActivate(context);
    }

    /**
     * If there's no token, check if the route is public. Else, deny access.
     */
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}

import { Controller, Get, NotFoundException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { Public } from 'src/decorators/public.decorator';
import {
  TEST_AUTH_EMAIL,
  TEST_AUTH_ISSUER,
  TEST_AUTH_SUBJECT,
  testAuthEnabled,
  testAuthSecret,
} from './test-auth';

@Controller('__test')
export class TestAuthController {
  @Public()
  @Get('session')
  session() {
    if (!testAuthEnabled()) throw new NotFoundException();
    const expiresIn = 60 * 60 * 12;
    const accessToken = sign(
      {
        sub: TEST_AUTH_SUBJECT,
        email: TEST_AUTH_EMAIL,
        email_verified: true,
        given_name: 'Browser',
        family_name: 'Agent',
        name: 'Browser Agent',
        token_use: 'id',
      },
      testAuthSecret(),
      {
        algorithm: 'HS256',
        audience: 'local-browser-tests',
        issuer: TEST_AUTH_ISSUER,
        expiresIn,
      },
    );
    return {
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      user: {
        sub: TEST_AUTH_SUBJECT,
        email: TEST_AUTH_EMAIL,
        name: 'Browser Agent',
        given_name: 'Browser',
        family_name: 'Agent',
      },
    };
  }
}

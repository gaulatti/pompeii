import { InternalServerErrorException } from '@nestjs/common';

export const TEST_AUTH_ISSUER = 'pompeii-local-test-auth';
export const TEST_AUTH_SUBJECT = 'test:browser-agent';
export const TEST_AUTH_EMAIL = 'agent@local.test';

export function testAuthEnabled(): boolean {
  return process.env.AUTH_MODE === 'test';
}

export function testAuthSecret(): string {
  if (!testAuthEnabled()) {
    throw new InternalServerErrorException('Test authentication is disabled');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_MODE=test must never run with NODE_ENV=production');
  }
  const secret = process.env.TEST_AUTH_SECRET ?? '';
  if (secret.length < 32) {
    throw new Error('TEST_AUTH_SECRET must contain at least 32 characters');
  }
  return secret;
}

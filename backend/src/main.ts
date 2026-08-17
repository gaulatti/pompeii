import { Logger } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { join } from 'path';
import { AppModule } from './app.module';
import { AuthenticationGuard } from './authentication/authentication.guard';
import { TokenVerifierService } from './authentication/token-verifier.service';
import { UsersService } from './authentication/users/users.service';
import { PermissionGuard } from './authorization/rbac/permission.guard';
import { RbacService } from './authorization/rbac/rbac.service';
import { grpcPort, httpPort } from './utils/network';
import { loadApplicationSecrets } from './config/secrets-loader';

/**
 * Initializes and starts the NestJS application with Fastify adapter.
 *
 * - Creates a new Nest application using the Fastify adapter.
 * - Enables CORS for the application.
 * - Registers the global authentication guard.
 * - Starts the application and listens for REST API.
 *
 * @returns {Promise<void>} A promise that resolves when the application has started.
 */
async function bootstrap(): Promise<void> {
  await loadApplicationSecrets();
  if (process.env.AUTH_MODE === 'test' && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_MODE=test must never run with NODE_ENV=production');
  }
  /**
   * Create a new Nest application using the Fastify adapter
   */
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  /**
   * Enable CORS for the application
   */
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5187')
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  });

  /**
   * Register the global authenticatiojn guard
   */
  app.useGlobalGuards(
    new AuthenticationGuard(
      app.get(Reflector),
      app.get(TokenVerifierService),
      app.get(UsersService),
    ),
  );
  app.useGlobalGuards(
    new PermissionGuard(app.get(Reflector), app.get(RbacService)),
  );

  /**
   * Start the gRPC server
   */
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'pompeii.authorization.v1',
      protoPath: join(__dirname, './proto/authorization.proto'),
      url: `0.0.0.0:${grpcPort}`,
      loader: { keepCase: true },
    },
  });
  await app.startAllMicroservices();
  Logger.log(`🚀 authorization gRPC server running on port ${grpcPort}`);

  /**
   * Start the application.
   */
  await app.listen(httpPort, '0.0.0.0');
  Logger.log(`🚀 REST API running on port ${httpPort}`);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(`Pompeii bootstrap failed: ${message}`);
  process.exit(1);
});

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify, { LogController, type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { createDatabase } from "@vyasen/database";

import type { AppConfig } from "./config";
import { AppError } from "./errors";
import { AuthService } from "./modules/auth/auth.service";
import { EmailProvider, GoogleProvider } from "./modules/auth/auth.provider";
import authRoutes from "./modules/auth/auth.routes";

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: 16 * 1024,
    logger: {
      level: config.nodeEnv === "test" ? "silent" : "info",
      redact: [
        "req.headers.cookie",
        "req.headers.authorization",
        "res.headers.set-cookie",
      ],
    },
    logController: new LogController({ disableRequestLogging: true }),
    trustProxy: config.trustProxy,
  });
  const db = createDatabase(config.databaseUrl);
  const googleProvider =
    config.googleClientId && config.googleClientSecret
      ? new GoogleProvider(
          config.googleClientId,
          config.googleClientSecret,
          config.googleRedirectUri,
        )
      : null;
  const authService = new AuthService({
    db,
    config,
    emailProvider: new EmailProvider(config.smtp, (failure) => {
      app.log.error(failure, "Sign-in email delivery failed.");
    }),
    googleProvider,
  });

  app.decorateRequest("authContext", null);
  app.decorate("authService", authService);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error(
          { errorCode: error.code },
          "Authentication provider is unavailable.",
        );
      }
      if (error.retryAfterSeconds) {
        reply.header("retry-after", error.retryAfterSeconds);
      }
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    const httpStatusCode =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;
    const statusCode =
      httpStatusCode !== undefined &&
      httpStatusCode >= 400 &&
      httpStatusCode < 500
        ? httpStatusCode
        : 500;

    if (statusCode >= 500) {
      request.log.error(
        {
          errorName: error instanceof Error ? error.name : "unknown",
          statusCode,
        },
        "Request failed unexpectedly.",
      );
    }

    const code =
      statusCode === 400
        ? "invalid_request"
        : statusCode === 413
          ? "request_too_large"
          : statusCode === 404
            ? "not_found"
            : "internal_error";
    const message =
      statusCode === 400
        ? "The request is invalid."
        : statusCode === 413
          ? "The request is too large."
          : statusCode === 404
            ? "The requested resource was not found."
            : "An unexpected error occurred.";

    return reply.code(statusCode).send({ error: { code, message } });
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url,
        statusCode: reply.statusCode,
      },
      "Request completed.",
    );
  });

  await app.register(helmet);
  await app.register(cookie);
  await app.register(cors, {
    origin: config.webOrigins,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type"],
  });
  await app.register(authRoutes, {
    prefix: "/api/v1/auth",
    service: authService,
    config,
  });

  app.addHook("onClose", async () => {
    await db.destroy();
  });

  return app;
}

import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import {
  authEmailCodeRequestSchema,
  authEmailCodeResponseSchema,
  authEmailCodeVerificationSchema,
  authErrorResponseSchema,
  authGoogleAuthorizeQuerySchema,
  authGoogleCallbackQuerySchema,
  authGoogleCredentialSchema,
  authGoogleLinkResponseSchema,
  authGoogleNonceResponseSchema,
  authSessionResponseSchema,
  authSessionParamsSchema,
  authSessionsResponseSchema,
} from "@school-sms/contracts";

import type { AppConfig } from "../../config";
import { createAuthController } from "./auth.controller";
import { requireAuthenticated } from "./auth.guard";
import { requireTrustedOrigin } from "./auth.security";
import type { AuthService } from "./auth.service";

interface AuthRouteOptions {
  service: AuthService;
  config: AppConfig;
}

const authRoutes: FastifyPluginAsync<AuthRouteOptions> = async (
  server,
  options,
) => {
  const app = server.withTypeProvider<ZodTypeProvider>();
  const controller = createAuthController(options.service, options.config);
  const authenticated = requireAuthenticated(options.service, options.config);

  app.addHook("onRequest", requireTrustedOrigin(options.config));

  app.post(
    "/email/codes",
    {
      schema: {
        body: authEmailCodeRequestSchema,
        response: {
          202: authEmailCodeResponseSchema,
          400: authErrorResponseSchema,
          429: authErrorResponseSchema,
        },
      },
    },
    controller.requestEmailCode,
  );

  app.post(
    "/email/sessions",
    {
      schema: {
        body: authEmailCodeVerificationSchema,
        response: {
          200: authSessionResponseSchema,
          400: authErrorResponseSchema,
          429: authErrorResponseSchema,
        },
      },
    },
    controller.verifyEmailCode,
  );

  app.get(
    "/google/nonce",
    {
      schema: {
        response: {
          200: authGoogleNonceResponseSchema,
          429: authErrorResponseSchema,
        },
      },
    },
    controller.googleNonce,
  );

  app.get(
    "/google/authorize",
    {
      schema: {
        querystring: authGoogleAuthorizeQuerySchema,
      },
    },
    controller.googleAuthorize,
  );

  app.get(
    "/google/callback",
    {
      schema: {
        querystring: authGoogleCallbackQuerySchema,
      },
    },
    controller.googleCallback,
  );

  app.post(
    "/google/one-tap",
    {
      schema: {
        body: authGoogleCredentialSchema,
        response: {
          200: authSessionResponseSchema,
          401: authErrorResponseSchema,
          409: authErrorResponseSchema,
          429: authErrorResponseSchema,
        },
      },
    },
    controller.googleOneTap,
  );

  app.post(
    "/google/identities",
    {
      preHandler: authenticated,
      schema: {
        body: authGoogleCredentialSchema,
        response: {
          200: authGoogleLinkResponseSchema,
          401: authErrorResponseSchema,
          409: authErrorResponseSchema,
        },
      },
    },
    controller.linkGoogleIdentity,
  );

  app.get(
    "/session",
    {
      preHandler: authenticated,
      schema: {
        response: {
          200: authSessionResponseSchema,
          401: authErrorResponseSchema,
        },
      },
    },
    controller.currentSession,
  );

  app.delete("/session", controller.logout);

  app.get(
    "/sessions",
    {
      preHandler: authenticated,
      schema: {
        response: {
          200: authSessionsResponseSchema,
          401: authErrorResponseSchema,
        },
      },
    },
    controller.listSessions,
  );

  app.delete(
    "/sessions/:sessionId",
    {
      preHandler: authenticated,
      schema: {
        params: authSessionParamsSchema,
        response: { 401: authErrorResponseSchema },
      },
    },
    controller.revokeSession,
  );

  app.delete(
    "/sessions",
    {
      preHandler: authenticated,
      schema: {
        response: { 401: authErrorResponseSchema },
      },
    },
    controller.logoutAll,
  );
};

export default authRoutes;

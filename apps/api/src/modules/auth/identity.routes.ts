import type { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  identityChallengeSchema,
  identityVerificationSchema,
  signupProofSchema,
  operationSuccessSchema,
  authAvailabilitySchema,
  authPasswordSignInSchema,
  authPasswordSignupSchema,
  authEmailCodeResponseSchema,
  authSessionResponseSchema,
  accountDetailsSchema,
  personalProfileSchema,
  accountItemSchema,
} from "@vyasen/contracts";
import type { AppConfig } from "../../config";
import type { AuthService } from "./auth.service";
import type { IdentityService } from "./identity.service";
import { identityController } from "./identity.controller";
import { requireAuthenticated } from "./auth.guard";
import { requireTrustedOrigin } from "./auth.security";

const routes: FastifyPluginAsync<{
  service: IdentityService;
  auth: AuthService;
  config: AppConfig;
}> = async (server, options) => {
  const app = server.withTypeProvider<ZodTypeProvider>();
  const c = identityController(options.service, options.config);
  const required = requireAuthenticated(options.auth, options.config);
  app.addHook("onRequest", requireTrustedOrigin(options.config));
  app.addHook("preHandler", async (req) => {
    req.authContext = await options.auth.authenticateSession(
      req.cookies[options.config.sessionCookieName],
    );
  });
  app.get(
    "/availability",
    { schema: { response: { 200: authAvailabilitySchema } } },
    c.availability,
  );
  app.post(
    "/challenges",
    {
      schema: {
        body: identityChallengeSchema,
        response: { 200: authEmailCodeResponseSchema },
      },
    },
    c.issue,
  );
  app.post(
    "/challenges/verify",
    {
      schema: {
        body: identityVerificationSchema,
        response: {
          200: authSessionResponseSchema
            .or(signupProofSchema)
            .or(operationSuccessSchema),
        },
      },
    },
    c.verify,
  );
  app.post(
    "/password/signup",
    {
      schema: {
        body: authPasswordSignupSchema,
        response: { 200: authSessionResponseSchema },
      },
    },
    c.signup,
  );
  app.post(
    "/password/sessions",
    {
      schema: {
        body: authPasswordSignInSchema,
        response: { 200: authSessionResponseSchema },
      },
    },
    c.password,
  );
  app.get(
    "/account",
    {
      preHandler: required,
      schema: { response: { 200: accountDetailsSchema } },
    },
    c.account,
  );
  app.post(
    "/profile",
    {
      preHandler: required,
      schema: {
        body: personalProfileSchema,
        response: { 200: accountDetailsSchema },
      },
    },
    c.profile,
  );
  app.post(
    "/contacts/:id/primary",
    {
      preHandler: required,
      schema: {
        params: accountItemSchema,
        response: { 200: operationSuccessSchema },
      },
    },
    c.primary,
  );
  app.delete(
    "/identities/:id",
    {
      preHandler: required,
      schema: {
        params: accountItemSchema,
        response: { 200: operationSuccessSchema },
      },
    },
    c.unlink,
  );
};
export default routes;

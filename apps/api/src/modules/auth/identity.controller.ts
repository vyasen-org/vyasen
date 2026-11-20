import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  identityChallengeSchema,
  identityVerificationSchema,
  authPasswordSignInSchema,
  authPasswordSignupSchema,
  personalProfileSchema,
  accountItemSchema,
} from "@vyasen/contracts";
import type { AppConfig } from "../../config";
import type { IdentityService } from "./identity.service";
import { sessionMetadata, setSessionCookie } from "./auth.controller";

export function identityController(
  service: IdentityService,
  config: AppConfig,
) {
  async function sendSession(
    reply: FastifyReply,
    session: Awaited<ReturnType<IdentityService["password"]>>,
  ) {
    setSessionCookie(reply, config, session.token);
    return reply.send({ user: session.user });
  }
  return {
    availability: async () => service.availability(),
    issue: async (
      req: FastifyRequest<{ Body: z.infer<typeof identityChallengeSchema> }>,
    ) => service.issue(req.body, req.ip, req.authContext?.user.id ?? null),
    verify: async (
      req: FastifyRequest<{ Body: z.infer<typeof identityVerificationSchema> }>,
      reply: FastifyReply,
    ) => {
      const result = await service.verify(
        req.body,
        sessionMetadata(req),
        req.authContext?.user.id ?? null,
      );
      if ("token" in result) return sendSession(reply, result);
      return reply.send(result);
    },
    signup: async (
      req: FastifyRequest<{ Body: z.infer<typeof authPasswordSignupSchema> }>,
      reply: FastifyReply,
    ) =>
      sendSession(
        reply,
        await service.signup(
          req.body.email,
          req.body.proof,
          req.body.password,
          sessionMetadata(req),
        ),
      ),
    password: async (
      req: FastifyRequest<{ Body: z.infer<typeof authPasswordSignInSchema> }>,
      reply: FastifyReply,
    ) =>
      sendSession(
        reply,
        await service.password(
          req.body.email,
          req.body.password,
          sessionMetadata(req),
        ),
      ),
    account: async (req: FastifyRequest) =>
      service.account(req.authContext!.user.id),
    profile: async (
      req: Pick<FastifyRequest, "authContext"> & {
        body: z.infer<typeof personalProfileSchema>;
      },
    ) => service.updateProfile(req.authContext!.user.id, req.body),
    primary: async (
      req: Pick<FastifyRequest, "authContext"> & {
        params: z.infer<typeof accountItemSchema>;
      },
    ) =>
      service.changeMethod(req.authContext!.user.id, req.params.id, "primary"),
    unlink: async (
      req: Pick<FastifyRequest, "authContext"> & {
        params: z.infer<typeof accountItemSchema>;
      },
    ) =>
      service.changeMethod(req.authContext!.user.id, req.params.id, "unlink"),
    removeContact: async (
      req: Pick<FastifyRequest, "authContext"> & {
        params: z.infer<typeof accountItemSchema>;
      },
    ) =>
      service.changeMethod(
        req.authContext!.user.id,
        req.params.id,
        "remove_contact",
      ),
  };
}

import "fastify";

import type { AuthUser } from "@vyasen/contracts";
import type { AuthService } from "../modules/auth/auth.service";

declare module "fastify" {
  interface FastifyInstance {
    authService: AuthService;
  }

  interface FastifyRequest {
    authContext: { user: AuthUser; sessionId: string } | null;
  }
}

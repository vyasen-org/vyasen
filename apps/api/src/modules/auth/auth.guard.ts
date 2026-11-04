import type { FastifyRequest } from "fastify";

import type { AppConfig } from "../../config";
import { AppError } from "../../errors";
import type { AuthService } from "./auth.service";

export interface AuthenticatedContext {
  user: import("@vyasen/contracts").AuthUser;
  sessionId: string;
}

export function requireAuthenticated(
  service: AuthService,
  config: AppConfig,
) {
  return async function authenticate(request: FastifyRequest): Promise<void> {
    const session = await service.authenticateSession(
      request.cookies[config.sessionCookieName],
    );
    if (!session) {
      throw new AppError(401, "unauthorized", "Sign in to continue.");
    }
    request.authContext = session;
  };
}

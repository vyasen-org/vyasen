import type { FastifyRequest } from "fastify";

import type { AppConfig } from "../../config";
import { AppError } from "../../errors";

export function requireTrustedOrigin(config: AppConfig) {
  return async function verifyOrigin(request: FastifyRequest): Promise<void> {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

    const origin = request.headers.origin;
    if (!origin || !config.webOrigins.includes(origin)) {
      throw new AppError(
        403,
        "invalid_origin",
        "This request origin is not allowed.",
      );
    }
  };
}

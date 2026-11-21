import type { FastifyReply, FastifyRequest } from "fastify";
import UAParser from "ua-parser-js";

import type {
  AuthGoogleAuthorizeQuery,
  AuthGoogleCallbackQuery,
  AuthEmailCodeRequest,
  AuthEmailCodeVerification,
  AuthGoogleCredential,
  AuthSessionParams,
} from "@vyasen/contracts";

import type { AppConfig } from "../../config";
import { AppError } from "../../errors";
import type { AuthenticatedContext } from "./auth.guard";
import type { AuthService } from "./auth.service";
import type { SessionMetadata } from "./auth.repository";

const oauthStateCookieName = "school_sms_google_oauth";
const sessionLifetimeSeconds = 30 * 24 * 60 * 60;

export function createAuthController(service: AuthService, config: AppConfig) {
  return {
    async requestEmailCode(
      request: RequestData<{ body: AuthEmailCodeRequest; ip: string }>,
      reply: FastifyReply,
    ) {
      const response = await service.requestEmailCode(
        request.body.email,
        request.ip,
      );
      return reply.code(202).send(response);
    },

    async verifyEmailCode(
      request: RequestData<{
        body: AuthEmailCodeVerification;
        ip: string;
        headers: FastifyRequest["headers"];
      }>,
      reply: FastifyReply,
    ) {
      const session = await service.verifyEmailCode(
        request.body.challengeId,
        request.body.email,
        request.body.code,
        sessionMetadata(request),
      );
      setSessionCookie(reply, config, session.token);
      return reply.code(200).send({ user: session.user });
    },

    async googleNonce(
      request: RequestData<{ ip: string }>,
      reply: FastifyReply,
    ) {
      return reply.code(200).send(await service.createOneTapNonce(request.ip));
    },

    async googleAuthorize(
      request: RequestData<{ query: AuthGoogleAuthorizeQuery }>,
      reply: FastifyReply,
    ) {
      const result = await service.beginGoogleOAuth(
        request.query.returnTo ?? "/",
      );
      reply.setCookie(oauthStateCookieName, result.cookieValue, {
        httpOnly: true,
        secure: config.sessionCookieSecure,
        sameSite: "lax",
        path: "/api/v1/auth/google",
        maxAge: 10 * 60,
        ...(config.sessionCookieDomain
          ? { domain: config.sessionCookieDomain }
          : {}),
      });
      return reply.redirect(result.authorizationUrl, 302);
    },

    async googleCallback(
      request: RequestData<{
        query: AuthGoogleCallbackQuery;
        cookies: FastifyRequest["cookies"];
        ip: string;
        headers: FastifyRequest["headers"];
        log: FastifyRequest["log"];
      }>,
      reply: FastifyReply,
    ) {
      const stateCookie = request.cookies[oauthStateCookieName];
      const returnTo = service.googleOAuthReturnTo(stateCookie);
      clearOAuthStateCookie(reply, config);

      try {
        if (
          request.query.error ||
          !request.query.code ||
          !request.query.state
        ) {
          request.log.warn(
            {
              providerError: request.query.error ?? null,
              hasCode: Boolean(request.query.code),
              hasState: Boolean(request.query.state),
            },
            "Google returned an incomplete authorization response.",
          );
          return reply.redirect(
            webRedirect(config, returnTo, "google-failed"),
            302,
          );
        }
        const session = await service.completeGoogleOAuth(
          request.query.code,
          request.query.state,
          stateCookie,
          sessionMetadata(request),
        );
        setSessionCookie(reply, config, session.token);
        return reply.redirect(
          webRedirect(config, session.returnTo, "complete"),
          302,
        );
      } catch (error) {
        if (error instanceof AppError && error.statusCode >= 500) {
          request.log.error(
            { errorCode: error.code },
            "Google sign-in callback failed.",
          );
        } else if (error instanceof AppError) {
          request.log.warn(
            { errorCode: error.code },
            "Google sign-in callback was rejected.",
          );
        } else if (!(error instanceof AppError)) {
          request.log.error(
            { errorName: error instanceof Error ? error.name : "unknown" },
            "Google sign-in callback failed.",
          );
        }
        const reason =
          error instanceof AppError && error.code === "identity_link_required"
            ? "link-required"
            : "google-failed";
        return reply.redirect(webRedirect(config, returnTo, reason), 302);
      }
    },

    async googleOneTap(
      request: RequestData<{
        body: AuthGoogleCredential;
        ip: string;
        headers: FastifyRequest["headers"];
      }>,
      reply: FastifyReply,
    ) {
      const session = await service.signInWithOneTap(
        request.body.credential,
        sessionMetadata(request),
      );
      setSessionCookie(reply, config, session.token);
      return reply.code(200).send({ user: session.user });
    },

    async linkGoogleIdentity(
      request: RequestData<{
        body: AuthGoogleCredential;
        ip: string;
        authContext: FastifyRequest["authContext"];
      }>,
      reply: FastifyReply,
    ) {
      await service.linkGoogleIdentity(
        requireAuthContext(request).user.id,
        request.body.credential,
        request.ip,
      );
      return reply.code(200).send({ linked: true });
    },

    async currentSession(
      request: RequestData<{ authContext: FastifyRequest["authContext"] }>,
      reply: FastifyReply,
    ) {
      return reply.code(200).send({ user: requireAuthContext(request).user });
    },

    async listSessions(
      request: RequestData<{ authContext: FastifyRequest["authContext"] }>,
      reply: FastifyReply,
    ) {
      const { user, sessionId } = requireAuthContext(request);
      return reply
        .code(200)
        .send({ sessions: await service.listSessions(user.id, sessionId) });
    },

    async logout(
      request: RequestData<{ cookies: FastifyRequest["cookies"] }>,
      reply: FastifyReply,
    ) {
      await service.logout(request.cookies[config.sessionCookieName]);
      clearSessionCookie(reply, config);
      return reply.code(204).send();
    },

    async revokeSession(
      request: RequestData<{
        params: AuthSessionParams;
        authContext: FastifyRequest["authContext"];
      }>,
      reply: FastifyReply,
    ) {
      const { user, sessionId } = requireAuthContext(request);
      await service.revokeSession(user.id, request.params.sessionId);
      if (request.params.sessionId === sessionId) {
        clearSessionCookie(reply, config);
      }
      return reply.code(204).send();
    },

    async logoutAll(
      request: RequestData<{ authContext: FastifyRequest["authContext"] }>,
      reply: FastifyReply,
    ) {
      await service.revokeAllSessions(requireAuthContext(request).user.id);
      clearSessionCookie(reply, config);
      return reply.code(204).send();
    },
  };
}

function requireAuthContext(
  request: Pick<FastifyRequest, "authContext">,
): AuthenticatedContext {
  if (!request.authContext) {
    throw new AppError(401, "unauthorized", "Sign in to continue.");
  }
  return request.authContext;
}

function sessionMetadata(
  request: Pick<FastifyRequest, "ip" | "headers">,
): SessionMetadata {
  const userAgent =
    typeof request.headers["user-agent"] === "string"
      ? request.headers["user-agent"].slice(0, 1024)
      : null;
  const parser = new UAParser(userAgent ?? "");
  const browser = parser.getBrowser().name?.slice(0, 120) ?? null;
  const os = parser.getOS().name?.slice(0, 120) ?? null;
  const parsedDevice = parser.getDevice();
  const deviceType = parsedDevice.type?.slice(0, 40) ?? "desktop";
  const deviceName =
    [browser, os].filter(Boolean).join(" on ").slice(0, 200) ||
    (deviceType === "desktop" ? "Desktop browser" : "Mobile browser");

  return {
    ipAddress: request.ip || null,
    userAgent,
    deviceName,
    deviceType,
    browser,
    os,
  };
}

type RequestData<T> = Pick<
  FastifyRequest,
  "ip" | "headers" | "cookies" | "log" | "authContext"
> &
  T;

function setSessionCookie(
  reply: FastifyReply,
  config: AppConfig,
  token: string,
) {
  reply.setCookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: config.sessionCookieSecure,
    sameSite: config.sessionCookieSameSite,
    path: "/api/v1/auth",
    maxAge: sessionLifetimeSeconds,
    ...(config.sessionCookieDomain
      ? { domain: config.sessionCookieDomain }
      : {}),
  });
}

function clearSessionCookie(reply: FastifyReply, config: AppConfig) {
  reply.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: config.sessionCookieSecure,
    sameSite: config.sessionCookieSameSite,
    path: "/api/v1/auth",
    ...(config.sessionCookieDomain
      ? { domain: config.sessionCookieDomain }
      : {}),
  });
}

function clearOAuthStateCookie(reply: FastifyReply, config: AppConfig) {
  reply.clearCookie(oauthStateCookieName, {
    httpOnly: true,
    secure: config.sessionCookieSecure,
    sameSite: "lax",
    path: "/api/v1/auth/google",
    ...(config.sessionCookieDomain
      ? { domain: config.sessionCookieDomain }
      : {}),
  });
}

function webRedirect(
  config: AppConfig,
  returnTo: string,
  authResult: string,
): string {
  const origin = config.webOrigins[0];
  const url = new URL(returnTo, origin);
  url.searchParams.set("auth", authResult);
  if (authResult !== "complete") url.searchParams.set("login", "1");
  return url.toString();
}

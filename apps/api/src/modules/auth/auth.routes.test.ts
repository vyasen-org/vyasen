import assert from "node:assert/strict";
import test from "node:test";

import type { AppConfig } from "../../config";
import { buildApp } from "../../app";

const testConfig: AppConfig = {
  apiHost: "127.0.0.1",
  apiPort: 4000,
  apiPublicOrigin: "http://localhost:4000",
  authCodeHashSecret: "test-code-secret-value-longer-than-32-characters",
  authRateLimitSecret: "test-rate-secret-value-longer-than-32-characters",
  authStateSecret: "test-state-secret-value-longer-than-32-characters",
  databaseUrl: "postgres://test:test@127.0.0.1:5432/school_sms_test",
  googleClientId: null,
  googleClientSecret: null,
  googleRedirectUri: "http://localhost:4000/api/v1/auth/google/callback",
  nodeEnv: "test",
  sessionCookieDomain: undefined,
  sessionCookieName: "school_sms_session",
  sessionCookieSameSite: "lax",
  sessionCookieSecure: false,
  smtp: null,
  trustProxy: false,
  webOrigins: ["http://localhost:3000"],
};

test("auth routes enforce origin and authentication without a database connection", async () => {
  const app = await buildApp(testConfig);
  try {
    const untrustedPost = await app.inject({
      method: "POST",
      url: "/api/v1/auth/email/codes",
      headers: { origin: "https://untrusted.example" },
      payload: { email: "user@example.com" },
    });
    assert.equal(untrustedPost.statusCode, 403);
    assert.equal(untrustedPost.json().error.code, "invalid_origin");

    const invalidEmail = await app.inject({
      method: "POST",
      url: "/api/v1/auth/email/codes",
      headers: { origin: "http://localhost:3000" },
      payload: { email: "not-an-email" },
    });
    assert.equal(invalidEmail.statusCode, 400);
    assert.equal(invalidEmail.json().error.code, "invalid_request");

    const noSession = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
    });
    assert.equal(noSession.statusCode, 401);
    assert.equal(noSession.json().error.code, "unauthorized");

    const noGoogleConfiguration = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/nonce",
    });
    assert.equal(noGoogleConfiguration.statusCode, 200);
    assert.equal(noGoogleConfiguration.json().clientId, null);
    assert.equal(noGoogleConfiguration.json().nonce, null);

    const logout = await app.inject({
      method: "DELETE",
      url: "/api/v1/auth/session",
      headers: { origin: "http://localhost:3000" },
    });
    assert.equal(logout.statusCode, 204);

    for (const endpoint of [
      ["POST", "/api/v1/auth/email/codes"],
      ["POST", "/api/v1/auth/email/sessions"],
      ["GET", "/api/v1/auth/google/authorize"],
      ["GET", "/api/v1/auth/google/callback"],
      ["POST", "/api/v1/auth/google/one-tap"],
      ["GET", "/api/v1/auth/sessions"],
      ["DELETE", "/api/v1/auth/sessions/:sessionId"],
      ["DELETE", "/api/v1/auth/sessions"],
    ] as const) {
      assert.ok(
        app.hasRoute({
          method: endpoint[0],
          url: endpoint[1],
        }),
        `Missing registered route: ${endpoint.join(" ")}`,
      );
    }
  } finally {
    await app.close();
  }
});

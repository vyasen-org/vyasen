import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { GoogleProvider } from "./auth.provider";
import { isSupportedPasswordHash } from "./password-format";

test("Google verifier rejects invalid signature, issuer, audience and expiry using signed local tokens", async () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const client = new OAuth2Client("test-client");
  // Replace only certificate transport; Google's real JWT verifier still executes.
  client.getFederatedSignonCertsAsync = async () => ({
    certs: {
      local: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
    },
    format: "PEM" as Awaited<
      ReturnType<typeof client.getFederatedSignonCertsAsync>
    >["format"],
  });
  const provider = new GoogleProvider(
    "test-client",
    "secret",
    "http://localhost/callback",
    client,
  );
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: "https://accounts.google.com",
    aud: "test-client",
    sub: "subject",
    email: "test@example.test",
    email_verified: true,
    iat: now - 10,
    exp: now + 600,
    nonce: "test-nonce",
  };
  const token = (overrides = {}, badSignature = false) => {
    const body =
      Buffer.from(JSON.stringify({ alg: "RS256", kid: "local" })).toString(
        "base64url",
      ) +
      "." +
      Buffer.from(JSON.stringify({ ...claims, ...overrides })).toString(
        "base64url",
      );
    const signature = sign("RSA-SHA256", Buffer.from(body), keys.privateKey);
    if (badSignature) signature[0] ^= 1;
    return body + "." + signature.toString("base64url");
  };
  assert.equal(
    (await provider.verifyOneTapCredential(token())).subject,
    "subject",
  );
  for (const value of [
    token({}, true),
    token({ iss: "https://attacker.invalid" }),
    token({ aud: "another-client" }),
    token({ iat: now - 3600, exp: now - 1000 }),
  ]) {
    await assert.rejects(provider.verifyOneTapCredential(value), {
      code: "google_auth_failed",
    });
  }
});

test("password fallback accepts only the supported canonical encoding", () => {
  const valid =
    "$argon2id$v=19$m=65536,t=3,p=1$" +
    Buffer.alloc(16).toString("base64") +
    "$" +
    Buffer.alloc(32).toString("base64");
  assert.equal(isSupportedPasswordHash(valid), true);
  for (const value of [
    "invalid",
    valid.replace("v=19", "v=16"),
    valid.replace("argon2id", "argon2i"),
    valid + "!",
    valid.replace("m=65536", "m=1"),
  ])
    assert.equal(isSupportedPasswordHash(value), false);
});

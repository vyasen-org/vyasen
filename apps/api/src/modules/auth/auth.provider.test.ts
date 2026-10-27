import assert from "node:assert/strict";
import test from "node:test";

import {
  createOAuthState,
  createPkcePair,
  createSessionToken,
  hashSessionToken,
  hashVerificationCode,
  hashesMatch,
  readOAuthState,
  type SignedOAuthState,
} from "./auth.provider";

test("verification-code hashes match only the exact code and secret", () => {
  const hash = hashVerificationCode("004219", "test-secret-that-is-long-enough");

  assert.notEqual(hash, "004219");
  assert.equal(
    hashesMatch(
      hash,
      hashVerificationCode("004219", "test-secret-that-is-long-enough"),
    ),
    true,
  );
  assert.equal(
    hashesMatch(
      hash,
      hashVerificationCode("004218", "test-secret-that-is-long-enough"),
    ),
    false,
  );
  assert.equal(
    hashesMatch(
      hash,
      hashVerificationCode("004219", "a-different-test-secret"),
    ),
    false,
  );
});

test("session tokens are random and only their digest is persisted", () => {
  const firstToken = createSessionToken();
  const secondToken = createSessionToken();

  assert.equal(firstToken.length, 43);
  assert.notEqual(firstToken, secondToken);
  assert.equal(hashSessionToken(firstToken).length, 64);
  assert.notEqual(hashSessionToken(firstToken), firstToken);
});

test("OAuth state is authenticated and rejects modification", () => {
  const state: SignedOAuthState = {
    state: "state-value",
    nonce: "nonce-value",
    codeVerifier: "pkce-verifier",
    expiresAt: Date.now() + 60_000,
    returnTo: "/settings/appearance?login=1",
  };
  const secret = "test-signing-secret-with-more-than-32-characters";
  const signed = createOAuthState(state, secret);

  assert.deepEqual(readOAuthState(signed, secret), state);
  assert.equal(readOAuthState(`${signed}x`, secret), null);
  assert.equal(readOAuthState(signed, "a-different-signing-secret"), null);
  assert.equal(readOAuthState(undefined, secret), null);
});

test("PKCE challenges are derived from independent high-entropy verifiers", () => {
  const first = createPkcePair();
  const second = createPkcePair();

  assert.notEqual(first.verifier, second.verifier);
  assert.notEqual(first.challenge, first.verifier);
  assert.notEqual(first.challenge, second.challenge);
});

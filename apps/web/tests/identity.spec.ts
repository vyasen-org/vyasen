import { expect, test } from "@playwright/test";
test.describe.configure({ mode: "serial" });

test("automatic One Tap submits a delayed credential once", async ({
  page,
}) => {
  let submissions = 0;
  await page.route("**/api/v1/auth/google/nonce", (route) =>
    route.fulfill({
      json: {
        clientId: "test-client",
        nonce: "test-nonce",
        expiresInSeconds: 300,
      },
    }),
  );
  await page.route("**/api/v1/auth/google/one-tap", (route) => {
    submissions += 1;
    return route.fulfill({
      status: 401,
      json: {
        error: { code: "test_rejected", message: "Controlled provider" },
      },
    });
  });
  await page.addInitScript(() => {
    let callback: ((response: { credential: string }) => void) | undefined;
    window.google = {
      accounts: {
        id: {
          initialize(options) {
            callback = options.callback;
          },
          prompt() {
            window.setTimeout(() => {
              callback?.({ credential: "controlled-credential" });
              callback?.({ credential: "controlled-credential" });
            }, 500);
          },
          cancel() {},
          disableAutoSelect() {},
        },
      },
    };
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => submissions).toBe(1);
});

test("One Tap ignores a credential after navigation tears down its prompt", async ({
  page,
}) => {
  let submissions = 0;
  await page.route("**/api/v1/auth/google/nonce", (route) =>
    route.fulfill({
      json: {
        clientId: "test-client",
        nonce: "test-nonce",
        expiresInSeconds: 300,
      },
    }),
  );
  await page.route("**/api/v1/auth/google/one-tap", (route) => {
    submissions++;
    return route.fulfill({
      status: 401,
      json: {
        error: { code: "test_rejected", message: "Controlled provider" },
      },
    });
  });
  await page.addInitScript(() => {
    window.google = {
      accounts: {
        id: {
          initialize(options) {
            window.addEventListener("test-credential", () =>
              options.callback({ credential: "controlled-credential" }),
            );
          },
          prompt() {
            document.documentElement.setAttribute("data-test-prompt", "ready");
          },
          cancel() {},
          disableAutoSelect() {},
        },
      },
    };
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-test-prompt",
    "ready",
  );
  await page.evaluate(async () => {
    const { router } = await import("../src/router");
    await router.navigate({ to: "/settings/appearance" });
  });
  await expect(page).toHaveURL(/settings\/appearance/);
  await page.evaluate(() => window.dispatchEvent(new Event("test-credential")));
  // Allow an incorrectly retained callback enough time to dispatch its request.
  await page.waitForTimeout(500);
  expect(submissions).toBe(0);
});

for (const bobMethod of ["email", "password", "sms"] as const) {
  test(`Alice's private caches are cleared before Bob signs in with ${bobMethod}`, async ({
    page,
    request,
  }) => {
    const api = "http://127.0.0.1:4318";
    const origin = "http://127.0.0.1:4317";
    if (bobMethod === "sms") await request.get(api + "/test-sms?enabled=true");
    const alice = "alice-" + Date.now() + "@example.test";
    const issued = await page.request.post(api + "/api/v1/auth/challenges", {
      headers: { origin },
      data: { channel: "email", purpose: "sign_in", destination: alice },
    });
    const { challengeId } = await issued.json();
    const code = await request.get(
      api + "/test-code?destination=" + encodeURIComponent(alice),
    );
    const signed = await page.request.post(
      api + "/api/v1/auth/challenges/verify",
      {
        headers: { origin },
        data: {
          channel: "email",
          purpose: "sign_in",
          destination: alice,
          challengeId,
          code: (await code.json()).code,
        },
      },
    );
    expect(signed.status()).toBe(200);
    await page.request.post(api + "/api/v1/auth/profile", {
      headers: { origin },
      data: {
        first_name: "Private Alice",
        middle_name: null,
        surname: null,
        image_url: null,
      },
    });
    await page.goto("/settings/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
      "Private Alice",
    );
    await page.evaluate(async () => {
      const { router } = await import("../src/router");
      await router.navigate({ to: "/settings/account" });
    });
    page.once("dialog", (dialog) => dialog.accept());
    const aliceSessions = await (
      await page.request.get(api + "/api/v1/auth/sessions")
    ).json();
    await page
      .getByRole("button", { name: "Revoke session", exact: true })
      .click();
    await expect
      .poll(async () =>
        (await page.request.get(api + "/api/v1/auth/session")).status(),
      )
      .toBe(401);
    await page.evaluate(async () => {
      const { router } = await import("../src/router");
      await router.navigate({ to: "/" });
    });
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const bob =
      bobMethod === "sms"
        ? "+1415555" + String(Date.now()).slice(-4)
        : "bob-" + Date.now() + "@example.test";
    if (bobMethod === "password") {
      const signup = { destination: bob, channel: "email", purpose: "signup" };
      const challenge = await (
        await request.post(api + "/api/v1/auth/challenges", {
          headers: { origin },
          data: signup,
        })
      ).json();
      const code = (
        await (
          await request.get(
            api + "/test-code?destination=" + encodeURIComponent(bob),
          )
        ).json()
      ).code;
      const proof = await (
        await request.post(api + "/api/v1/auth/challenges/verify", {
          headers: { origin },
          data: { ...signup, challengeId: challenge.challengeId, code },
        })
      ).json();
      const created = await request.post(api + "/api/v1/auth/password/signup", {
        headers: { origin },
        data: {
          email: bob,
          proof: proof.proof,
          password: "secure Bob password",
        },
      });
      expect(created.status()).toBe(200);
      await page
        .getByLabel("Email or international phone", { exact: true })
        .fill(bob);
      await page
        .getByLabel("Password", { exact: true })
        .fill("secure Bob password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    } else if (bobMethod === "sms") {
      await request.get(api + "/test-sms?enabled=true");
      await page
        .getByLabel("Sign-in method", { exact: true })
        .selectOption("otp");
      await page
        .getByLabel("Email or international phone", { exact: true })
        .fill(bob);
      await page
        .getByRole("button", { name: "Send verification code", exact: true })
        .click();
      await page.getByLabel("Verification code", { exact: true }).waitFor();
      const codeUrl = api + "/test-code?destination=" + encodeURIComponent(bob);
      await expect
        .poll(async () => (await (await request.get(codeUrl)).json()).code)
        .toMatch(/^\d{6}$/);
      await page
        .getByLabel("Verification code", { exact: true })
        .fill((await (await request.get(codeUrl)).json()).code);
      await page
        .getByRole("button", { name: "Verify code", exact: true })
        .click();
    } else {
      await page.getByLabel("Email", { exact: true }).fill(bob);
      await page.getByRole("button", { name: "Continue with email" }).click();
      await page.getByLabel("6-digit verification code").waitFor();
      const codeUrl = api + "/test-code?destination=" + encodeURIComponent(bob);
      await expect
        .poll(async () => (await (await request.get(codeUrl)).json()).code)
        .toMatch(/^\d{6}$/);
      await page
        .getByLabel("6-digit verification code")
        .fill((await (await request.get(codeUrl)).json()).code);
      await page.getByRole("button", { name: "Verify", exact: true }).click();
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect
      .poll(
        async () =>
          (await (await page.request.get(api + "/api/v1/auth/session")).json())
            .user?.email,
      )
      .toBe(bobMethod === "sms" ? "" : bob);
    await page.evaluate(async () => {
      const { router } = await import("../src/router");
      await router.navigate({ to: "/settings/profile" });
    });
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
      "",
    );
    await expect(page.getByText("Private Alice")).toHaveCount(0);
    await page.evaluate(async () => {
      const { router } = await import("../src/router");
      await router.navigate({ to: "/settings/account" });
    });
    await expect(
      page.getByRole("button", { name: "Revoke session", exact: true }),
    ).toHaveCount(bobMethod === "password" ? 2 : 1);
    const cachedSessions = await page.evaluate(async () => {
      const { queryClient } = await import("../src/lib/query-client");
      return JSON.stringify(
        queryClient.getQueriesData({ queryKey: ["auth", "sessions"] }),
      );
    });
    for (const session of aliceSessions.sessions)
      expect(cachedSessions).not.toContain(session.id);
    if (bobMethod === "sms") await request.get(api + "/test-sms?enabled=false");
  });
}

for (const channel of ["email", "sms"] as const) {
  test(
    channel + " passwordless signup uses a real API session",
    async ({ page, request }) => {
      if (channel === "sms")
        await request.get("http://127.0.0.1:4318/test-sms?enabled=true");
      try {
        const destination =
          channel === "sms"
            ? "+1415555" + String(Date.now()).slice(-4)
            : "otp-" + Date.now() + "@example.test";
        await page.goto("/?login=1", { waitUntil: "domcontentloaded" });
        await page
          .getByLabel("Sign-in method", { exact: true })
          .selectOption("otp");
        await page
          .getByLabel("Email or international phone", { exact: true })
          .fill(destination);
        await page
          .getByRole("button", { name: "Send verification code", exact: true })
          .click();
        await expect(
          page.getByLabel("Verification code", { exact: true }),
        ).toBeVisible();
        const delivery = await request.get(
          "http://127.0.0.1:4318/test-code?destination=" +
            encodeURIComponent(destination),
        );
        await page
          .getByLabel("Verification code", { exact: true })
          .fill((await delivery.json()).code);
        await page
          .getByRole("button", { name: "Verify code", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(
          (
            await page.request.get("http://127.0.0.1:4318/api/v1/auth/session")
          ).status(),
        ).toBe(200);
      } finally {
        if (channel === "sms")
          await request.get("http://127.0.0.1:4318/test-sms?enabled=false");
      }
    },
  );
}

test("password signup verifies email first, saves profile, and revokes the session", async ({
  page,
  request,
}) => {
  const email = "browser-" + Date.now() + "@example.test";
  await page.goto("/?login=1", { waitUntil: "domcontentloaded" });
  await page
    .getByLabel("Sign-in method", { exact: true })
    .selectOption("signup");
  await page
    .getByLabel("Email or international phone", { exact: true })
    .fill(email);
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(
    page.getByLabel("Verification code", { exact: true }),
  ).toBeVisible();
  const delivery = await request.get(
    "http://127.0.0.1:4318/test-code?destination=" + encodeURIComponent(email),
  );
  const { code } = await delivery.json();
  await page.getByLabel("Verification code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(
    page.getByLabel("Create password", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Create password", { exact: true })
    .fill("a secure browser password");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("a secure browser password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/settings/profile", { waitUntil: "domcontentloaded" });
  await page.getByLabel("First name", { exact: true }).fill("Asha");
  await page.getByLabel("Surname", { exact: true }).fill("Patel");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profile saved." }),
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Asha",
  );
  const contactEmail = "contact-" + Date.now() + "@example.test";
  await page
    .getByLabel("Email or international phone", { exact: true })
    .fill(contactEmail);
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(
    page.getByLabel("Verification code", { exact: true }),
  ).toBeVisible();
  const contactDelivery = await request.get(
    "http://127.0.0.1:4318/test-code?destination=" +
      encodeURIComponent(contactEmail),
  );
  await page
    .getByLabel("Verification code", { exact: true })
    .fill((await contactDelivery.json()).code);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText(contactEmail, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Make primary", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByText(contactEmail, { exact: true })
    .locator("..")
    .getByRole("button", { name: "Remove contact" })
    .click();
  await expect(page.getByText(contactEmail, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Remove method", exact: true }),
  ).toBeDisabled();
  const linkedEmail = "linked-" + Date.now() + "@example.test";
  await page.getByLabel("Verification purpose").selectOption("account_link");
  await page
    .getByLabel("Email or international phone", { exact: true })
    .fill(linkedEmail);
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(
    page.getByLabel("Verification code", { exact: true }),
  ).toBeVisible();
  const linkDelivery = await request.get(
    "http://127.0.0.1:4318/test-code?destination=" +
      encodeURIComponent(linkedEmail),
  );
  await page
    .getByLabel("Verification code", { exact: true })
    .fill((await linkDelivery.json()).code);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(
    page.getByText("email: " + linkedEmail, { exact: true }),
  ).toBeVisible();
  await page.goto("/settings/account", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("(this device)", { exact: false })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Sign out all devices", exact: true })
    .click();
  await expect
    .poll(async () =>
      (
        await page.request.get("http://127.0.0.1:4318/api/v1/auth/session")
      ).status(),
    )
    .toBe(401);
  await page.goto("/?login=1", { waitUntil: "domcontentloaded" });
  await page
    .getByLabel("Email or international phone", { exact: true })
    .fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a secure browser password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("SMS unavailability is explicit and offers email or Google", async ({
  page,
}) => {
  await page.goto("/?login=1", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Sign-in method", { exact: true }).selectOption("otp");
  await page
    .getByLabel("Email or international phone", { exact: true })
    .fill("+14155552671");
  await expect(
    page.getByText("SMS is unavailable. Use email or Google.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send verification code", exact: true }),
  ).toBeDisabled();
});

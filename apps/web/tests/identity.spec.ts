import { expect, test } from "@playwright/test";
test.describe.configure({ mode: "serial" });

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

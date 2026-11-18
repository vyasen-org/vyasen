import { z } from "zod";

export const identityChallengeSchema = z.object({
  destination: z.string().trim().min(3).max(254),
  channel: z.enum(["email", "sms"]),
  purpose: z.enum(["signup", "sign_in", "contact_verify", "account_link"]),
});
export const identityVerificationSchema = identityChallengeSchema.extend({
  challengeId: z.uuid(),
  code: z.string().regex(/^\d{6}$/),
});
export const signupProofSchema = z.object({
  proof: z.string().min(32).max(128),
});
const name = z.string().trim().min(1).max(100).nullable();
export const personalProfileSchema = z.object({
  first_name: name,
  middle_name: name,
  surname: name,
  image_url: z.url().max(2048).nullable(),
});
export const accountDetailsSchema = z.object({
  profile: personalProfileSchema,
  contacts: z.array(
    z.object({
      id: z.uuid(),
      type: z.enum(["email", "phone"]),
      normalized_value: z.string(),
      is_primary: z.boolean(),
    }),
  ),
  identities: z.array(
    z.object({
      id: z.uuid(),
      provider: z.enum(["email", "phone", "google"]),
      provider_subject: z.string(),
    }),
  ),
});
export const accountItemSchema = z.object({ id: z.uuid() });
export const operationSuccessSchema = z.object({ success: z.literal(true) });
export const authAvailabilitySchema = z.object({ sms: z.boolean() });

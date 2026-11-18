import { z } from "zod";
import {
  identityChallengeSchema,
  identityVerificationSchema,
  authEmailCodeResponseSchema,
  signupProofSchema,
  authSessionResponseSchema,
  operationSuccessSchema,
  authPasswordSignInSchema,
  authPasswordSignupSchema,
  personalProfileSchema,
  accountDetailsSchema,
  authAvailabilitySchema,
} from "@vyasen/contracts";
import { apiRequest } from "@/lib/api-client";
export const identityKeys = {
  all: ["identity-account"] as const,
  account: (userId: string) => ["identity-account", userId] as const,
};
export const identityApi = {
  availability: () => apiRequest("/auth/availability", authAvailabilitySchema),
  issue: (input: z.infer<typeof identityChallengeSchema>) =>
    apiRequest("/auth/challenges", authEmailCodeResponseSchema, {
      method: "POST",
      body: JSON.stringify(identityChallengeSchema.parse(input)),
    }),
  verify: (input: z.infer<typeof identityVerificationSchema>) =>
    apiRequest(
      "/auth/challenges/verify",
      authSessionResponseSchema
        .or(signupProofSchema)
        .or(operationSuccessSchema),
      {
        method: "POST",
        body: JSON.stringify(identityVerificationSchema.parse(input)),
      },
    ),
  password: (input: z.infer<typeof authPasswordSignInSchema>) =>
    apiRequest("/auth/password/sessions", authSessionResponseSchema, {
      method: "POST",
      body: JSON.stringify(authPasswordSignInSchema.parse(input)),
    }),
  signup: (input: z.infer<typeof authPasswordSignupSchema>) =>
    apiRequest("/auth/password/signup", authSessionResponseSchema, {
      method: "POST",
      body: JSON.stringify(authPasswordSignupSchema.parse(input)),
    }),
  account: () => apiRequest("/auth/account", accountDetailsSchema),
  profile: (input: z.infer<typeof personalProfileSchema>) =>
    apiRequest("/auth/profile", accountDetailsSchema, {
      method: "POST",
      body: JSON.stringify(personalProfileSchema.parse(input)),
    }),
  primary: (id: string) =>
    apiRequest(
      "/auth/contacts/" + encodeURIComponent(id) + "/primary",
      operationSuccessSchema,
      { method: "POST" },
    ),
  removeContact: (id: string) =>
    apiRequest(
      "/auth/contacts/" + encodeURIComponent(id),
      operationSuccessSchema,
      { method: "DELETE" },
    ),
  unlink: (id: string) =>
    apiRequest(
      "/auth/identities/" + encodeURIComponent(id),
      operationSuccessSchema,
      { method: "DELETE" },
    ),
};

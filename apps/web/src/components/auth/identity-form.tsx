import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { identityApi } from "@/services/auth/identity.service";
import { adoptAuthSession } from "@/services/auth/auth.mutations";

const field =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export function IdentityForm({ onSuccess }: { onSuccess: () => void }) {
  const query = useQueryClient();
  const availability = useQuery({
    queryKey: ["auth", "availability"],
    queryFn: identityApi.availability,
  });
  const [method, setMethod] = useState<"password" | "signup" | "otp">(
    "password",
  );
  const [challenge, setChallenge] = useState<{
    id: string;
    expires: number;
    resend: number;
  } | null>(null);
  const [proof, setProof] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const form = useForm<{
    identifier: string;
    password: string;
    confirmation: string;
    code: string;
  }>({
    defaultValues: { identifier: "", password: "", confirmation: "", code: "" },
  });
  const identifier = (
    useWatch({ control: form.control, name: "identifier" }) ?? ""
  ).trim();
  const phone = identifier.startsWith("+");
  const channel = phone ? ("sms" as const) : ("email" as const);
  const purpose =
    method === "signup" ? ("signup" as const) : ("sign_in" as const);
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const mutation = useMutation({
    mutationFn: async (values: {
      identifier: string;
      password: string;
      confirmation: string;
      code: string;
    }) => {
      if (proof) {
        if (values.password !== values.confirmation)
          throw new Error("Passwords do not match.");
        return identityApi.signup({
          email: identifier,
          password: values.password,
          proof,
        });
      }
      if (challenge)
        return identityApi.verify({
          destination: identifier,
          channel,
          purpose,
          challengeId: challenge.id,
          code: values.code,
        });
      if (method === "password")
        return identityApi.password({
          email: identifier,
          password: values.password,
        });
      return identityApi.issue({ destination: identifier, channel, purpose });
    },
    onSuccess: async (result) => {
      if ("challengeId" in result) {
        setChallenge({
          id: result.challengeId,
          expires: Date.now() + result.expiresInSeconds * 1000,
          resend: Date.now() + 120000,
        });
        return;
      }
      if ("proof" in result) {
        setProof(result.proof);
        setChallenge(null);
        return;
      }
      if ("user" in result) {
        await adoptAuthSession(query, result);
        onSuccess();
      }
    },
  });
  const reset = () => {
    setChallenge(null);
    setProof("");
    form.resetField("code");
    form.resetField("password");
    form.resetField("confirmation");
    mutation.reset();
  };
  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <label className="block text-xs font-medium" htmlFor="identity-method">
        Sign-in method
      </label>
      <select
        id="identity-method"
        className={field}
        disabled={mutation.isPending}
        value={method}
        onChange={(e) => {
          setMethod(e.target.value as typeof method);
          reset();
        }}
      >
        <option value="password">Email and password</option>
        <option value="signup">Create account with password</option>
        <option value="otp">Email or phone code</option>
      </select>
      <label
        className="block text-xs font-medium"
        htmlFor="identity-identifier"
      >
        Email or international phone
      </label>
      <input
        id="identity-identifier"
        className={field}
        autoComplete="username"
        readOnly={Boolean(challenge || proof)}
        {...form.register("identifier", { required: true })}
      />
      {phone && availability.data?.sms === false && (
        <p role="status" className="text-sm text-muted-foreground">
          SMS is unavailable. Use email or Google.
        </p>
      )}
      {(method === "password" || proof) && (
        <>
          <label
            className="block text-xs font-medium"
            htmlFor="identity-password"
          >
            {proof ? "Create password" : "Password"}
          </label>
          <input
            id="identity-password"
            className={field}
            type="password"
            autoComplete={proof ? "new-password" : "current-password"}
            {...form.register("password", {
              required: true,
              minLength: 8,
              maxLength: 256,
            })}
          />
        </>
      )}
      {proof && (
        <>
          <label
            htmlFor="identity-confirmation"
            className="block text-xs font-medium"
          >
            Confirm password
          </label>
          <input
            id="identity-confirmation"
            className={field}
            type="password"
            autoComplete="new-password"
            {...form.register("confirmation", { required: true })}
          />
        </>
      )}
      {challenge && (
        <>
          <label htmlFor="identity-code" className="block text-xs font-medium">
            Verification code
          </label>
          <input
            id="identity-code"
            className={field}
            inputMode="numeric"
            autoComplete="one-time-code"
            {...form.register("code", { required: true, pattern: /^\d{6}$/ })}
          />
          <p role="status" className="text-xs text-muted-foreground">
            {clock >= challenge.expires
              ? "Code expired. Request another code."
              : "Code expires in " +
                Math.ceil((challenge.expires - clock) / 1000) +
                " seconds."}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending || clock < challenge.resend}
            onClick={() => {
              setChallenge(null);
              form.resetField("code");
            }}
          >
            Request another code
          </Button>
        </>
      )}
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Check the required fields and password length (8–256 characters).
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <Button
        className="w-full"
        disabled={
          mutation.isPending ||
          (phone && availability.data?.sms === false) ||
          Boolean(challenge && clock >= challenge.expires)
        }
        aria-busy={mutation.isPending}
      >
        {mutation.isPending
          ? "Please wait..."
          : proof
            ? "Create account"
            : challenge
              ? "Verify code"
              : method === "password"
                ? "Sign in"
                : "Send verification code"}
      </Button>
      {(challenge || proof) && (
        <Button type="button" variant="outline" onClick={reset}>
          Start again
        </Button>
      )}
    </form>
  );
}

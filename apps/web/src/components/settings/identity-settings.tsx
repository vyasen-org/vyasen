import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { GoogleLink } from "./google-link";
import { identityApi, identityKeys } from "@/services/auth/identity.service";
import { authKeys } from "@/services/auth/auth.service";

const field =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm";
export function IdentitySettings() {
  const client = useQueryClient();
  const account = useQuery({
    queryKey: identityKeys,
    queryFn: identityApi.account,
  });
  const [challenge, setChallenge] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState<"account_link" | "contact_verify">(
    "contact_verify",
  );
  const profile = useForm<{
    first_name: string;
    middle_name: string;
    surname: string;
    image_url: string;
  }>({
    values: {
      first_name: account.data?.profile.first_name ?? "",
      middle_name: account.data?.profile.middle_name ?? "",
      surname: account.data?.profile.surname ?? "",
      image_url: account.data?.profile.image_url ?? "",
    },
  });
  const verification = useForm<{
    destination: string;
    code: string;
    purpose: "account_link" | "contact_verify";
  }>({
    defaultValues: { destination: "", code: "", purpose: "contact_verify" },
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: identityKeys });
    await client.invalidateQueries({ queryKey: authKeys.session() });
  };
  const save = useMutation({
    mutationFn: (values: {
      first_name: string;
      middle_name: string;
      surname: string;
      image_url: string;
    }) =>
      identityApi.profile({
        first_name: values.first_name.trim() || null,
        middle_name: values.middle_name.trim() || null,
        surname: values.surname.trim() || null,
        image_url: values.image_url.trim() || null,
      }),
    onSuccess: refresh,
  });
  const verify = useMutation({
    mutationFn: async (values: {
      destination: string;
      code: string;
      purpose: "account_link" | "contact_verify";
    }) => {
      if (challenge)
        return identityApi.verify({
          destination,
          purpose,
          channel: destination.startsWith("+") ? "sms" : "email",
          challengeId: challenge,
          code: values.code,
        });
      return identityApi.issue({
        destination: values.destination,
        purpose: values.purpose,
        channel: values.destination.startsWith("+") ? "sms" : "email",
      });
    },
    onSuccess: async (result, values) => {
      if ("challengeId" in result) {
        setDestination(values.destination);
        setPurpose(values.purpose);
        setChallenge(result.challengeId);
      } else {
        setChallenge(null);
        verification.reset();
        await refresh();
      }
    },
  });
  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: "primary" | "unlink" }) =>
      kind === "primary" ? identityApi.primary(id) : identityApi.unlink(id),
    onSuccess: refresh,
  });
  if (account.isPending) return <p role="status">Loading account details...</p>;
  if (account.error) return <p role="alert">{account.error.message}</p>;
  return (
    <section className="theme-surface-panel space-y-6 rounded-2xl p-5 sm:p-6">
      <h2 className="text-sm font-semibold">
        Personal profile and sign-in methods
      </h2>
      <form
        className="space-y-3"
        onSubmit={profile.handleSubmit((values) => save.mutate(values))}
      >
        {(["first_name", "middle_name", "surname", "image_url"] as const).map(
          (key) => (
            <label key={key} className="block text-xs font-medium">
              {
                {
                  first_name: "First name",
                  middle_name: "Middle name (optional)",
                  surname: "Surname",
                  image_url: "Profile image URL",
                }[key]
              }
              <input className={field} {...profile.register(key)} />
            </label>
          ),
        )}
        <Button disabled={save.isPending}>Save profile</Button>
        {save.isSuccess && <p role="status">Profile saved.</p>}
        {save.error && <p role="alert">{save.error.message}</p>}
      </form>
      <h3 className="text-sm font-semibold">Verified personal contacts</h3>
      <p className="text-xs text-muted-foreground">
        Personal contacts do not grant sign-in access.
      </p>
      {account.data?.contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex flex-wrap items-center gap-3 text-sm"
        >
          <span>{contact.normalized_value}</span>
          {contact.is_primary ? (
            <span>Primary</span>
          ) : (
            <Button
              variant="outline"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: contact.id, kind: "primary" })}
            >
              Make primary
            </Button>
          )}
        </div>
      ))}
      <h3 className="text-sm font-semibold">Authentication identities</h3>
      <GoogleLink />
      {account.data?.identities.map((identity) => (
        <div
          key={identity.id}
          className="flex flex-wrap items-center gap-3 text-sm"
        >
          <span>
            {identity.provider}: {identity.provider_subject}
          </span>
          <Button
            variant="outline"
            disabled={action.isPending || account.data.identities.length <= 1}
            onClick={() => {
              if (window.confirm("Remove this sign-in method?"))
                action.mutate({ id: identity.id, kind: "unlink" });
            }}
          >
            Remove method
          </Button>
        </div>
      ))}
      {action.error && <p role="alert">{action.error.message}</p>}
      <form
        className="space-y-3"
        onSubmit={verification.handleSubmit((values) => verify.mutate(values))}
      >
        <label className="block text-xs font-medium">
          Verification purpose
          <select
            className={field}
            disabled={Boolean(challenge)}
            {...verification.register("purpose")}
          >
            <option value="contact_verify">Add personal contact</option>
            <option value="account_link">Link email or phone sign-in</option>
          </select>
        </label>
        <label className="block text-xs font-medium">
          Email or international phone
          <input
            className={field}
            readOnly={Boolean(challenge)}
            {...verification.register("destination", { required: true })}
          />
        </label>
        {challenge && (
          <label className="block text-xs font-medium">
            Verification code
            <input
              className={field}
              inputMode="numeric"
              autoComplete="one-time-code"
              {...verification.register("code", {
                required: true,
                pattern: /^\d{6}$/,
              })}
            />
          </label>
        )}
        <Button disabled={verify.isPending}>
          {verify.isPending
            ? "Please wait..."
            : challenge
              ? "Verify"
              : "Send verification code"}
        </Button>
        {challenge && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setChallenge(null);
              verification.resetField("code");
            }}
          >
            Start again / resend
          </Button>
        )}
        {verify.error && <p role="alert">{verify.error.message}</p>}
      </form>
    </section>
  );
}

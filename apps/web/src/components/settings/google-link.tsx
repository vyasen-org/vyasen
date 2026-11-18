import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getGoogleNonce,
  linkGoogleIdentity,
} from "@/services/auth/auth.service";
import { identityKeys } from "@/services/auth/identity.service";

export function GoogleLink() {
  const client = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const link = useMutation({
    mutationFn: async () => {
      const nonce = await getGoogleNonce();
      if (!nonce.clientId || !nonce.nonce)
        throw new Error("Google linking is unavailable.");
      if (!window.google) {
        await new Promise<void>((resolve, reject) => {
          let script = document.getElementById(
            "google-identity-services",
          ) as HTMLScriptElement | null;
          const timeout = window.setTimeout(
            () => reject(new Error("Google could not load. Try again.")),
            10000,
          );
          const loaded = () => {
            window.clearTimeout(timeout);
            resolve();
          };
          if (!script) {
            script = document.createElement("script");
            script.id = "google-identity-services";
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.addEventListener("load", loaded, { once: true });
            document.head.appendChild(script);
          } else script.addEventListener("load", loaded, { once: true });
        });
      }
      window.google!.accounts.id.initialize({
        client_id: nonce.clientId,
        nonce: nonce.nonce,
        auto_select: false,
        callback: (response) => {
          void linkGoogleIdentity({ credential: response.credential })
            .then(async () => {
              await client.invalidateQueries({ queryKey: identityKeys.all });
              setFeedback("Google sign-in method linked.");
            })
            .catch((error: unknown) =>
              setFeedback(
                error instanceof Error
                  ? error.message
                  : "Google linking failed.",
              ),
            );
        },
      });
      window.google!.accounts.id.prompt();
      setFeedback(
        "Choose a Google account to link. If the browser does not show a prompt, allow Google sign-in and try again.",
      );
    },
  });
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={link.isPending}
        onClick={() => link.mutate()}
      >
        Link Google sign-in
      </Button>
      {link.error && <p role="alert">{link.error.message}</p>}
      {feedback && (
        <p role="status" className="text-xs text-muted-foreground">
          {feedback}
        </p>
      )}
    </div>
  );
}

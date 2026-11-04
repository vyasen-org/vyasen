export const googleOAuthPopupName = "vyasen-google-oauth";
export const googleOAuthPopupStorageKey = "vyasen_google_oauth_popup";
export const googleOAuthPopupChannelName = "vyasen-google-oauth";
export const googleOAuthPopupMessageType = "vyasen:google-oauth-result";
export const googleOAuthPopupAckType = "vyasen:google-oauth-ack";

export type GoogleOAuthPopupResult =
  "complete" | "google-failed" | "link-required";

export function isGoogleOAuthPopup() {
  try {
    return sessionStorage.getItem(googleOAuthPopupStorageKey);
  } catch {
    return null;
  }
}

export function createGoogleOAuthPopupId() {
  return crypto.randomUUID();
}

export function publishGoogleOAuthPopupResult(
  id: string,
  result: GoogleOAuthPopupResult,
) {
  const message = { type: googleOAuthPopupMessageType, id, result };
  let channel: BroadcastChannel | null = null;
  let timeoutId = 0;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (acknowledged: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", onWindowMessage);
      channel?.close();
      resolve(acknowledged);
    };
    const onAcknowledgement = (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const acknowledgement = data as { type?: unknown; id?: unknown };
      if (
        acknowledgement.type === googleOAuthPopupAckType &&
        acknowledgement.id === id
      ) {
        finish(true);
      }
    };
    const onWindowMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.opener
      ) {
        return;
      }
      onAcknowledgement(event.data);
    };

    try {
      if (typeof BroadcastChannel === "function") {
        channel = new BroadcastChannel(googleOAuthPopupChannelName);
        channel.onmessage = (event: MessageEvent<unknown>) =>
          onAcknowledgement(event.data);
        channel.postMessage(message);
      }
    } catch {
      channel?.close();
      channel = null;
    }

    window.addEventListener("message", onWindowMessage);
    try {
      window.opener?.postMessage(message, window.location.origin);
    } catch {
      // The BroadcastChannel handoff remains available if the opener was severed.
    }

    timeoutId = window.setTimeout(() => finish(false), 3000);
  });
}

export function acknowledgeGoogleOAuthPopup(
  channel: BroadcastChannel | null,
  event: MessageEvent<unknown>,
  id: string,
) {
  const acknowledgement = { type: googleOAuthPopupAckType, id };
  try {
    channel?.postMessage(acknowledgement);
  } catch {
    // The window message path remains available as a fallback.
  }
  try {
    (event.source as Window | null)?.postMessage(
      acknowledgement,
      window.location.origin,
    );
  } catch {
    // The channel message path remains available as a fallback.
  }
}

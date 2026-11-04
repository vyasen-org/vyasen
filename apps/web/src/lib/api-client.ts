import {
  authErrorResponseSchema,
} from "@vyasen/contracts";
import type { z } from "zod";

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  responseSchema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  if (response.status === 204) {
    throw new ApiError(
      502,
      "invalid_api_response",
      "The server returned an invalid response.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      502,
      "invalid_api_response",
      "The server returned an invalid response.",
    );
  }

  const parsedResponse = responseSchema.safeParse(body);
  if (!parsedResponse.success) {
    throw new ApiError(
      502,
      "invalid_api_response",
      "The server returned an invalid response.",
    );
  }
  return parsedResponse.data;
}

export async function apiRequestNoContent(
  path: string,
  options: RequestInit = {},
): Promise<void> {
  const headers = new Headers(options.headers);
  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) throw await readApiError(response);
  if (response.status !== 204) {
    throw new ApiError(
      502,
      "invalid_api_response",
      "The server returned an invalid response.",
    );
  }
}

async function readApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiError(
      response.status,
      "request_failed",
      "The request could not be completed. Please try again.",
    );
  }
  const parsedError = authErrorResponseSchema.safeParse(body);
  if (parsedError.success) {
    return new ApiError(
      response.status,
      parsedError.data.error.code,
      parsedError.data.error.message,
      parseRetryAfter(response.headers.get("retry-after")),
    );
  }

  function parseRetryAfter(value: string | null): number | undefined {
    if (!value) return undefined;
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
  }
  return new ApiError(
    response.status,
    "request_failed",
    "The request could not be completed. Please try again.",
  );
}

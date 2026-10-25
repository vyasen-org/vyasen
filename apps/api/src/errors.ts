export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function invalidCodeError(): AppError {
  return new AppError(
    400,
    "invalid_verification_code",
    "The code is invalid or has expired. Request a new code and try again.",
  );
}

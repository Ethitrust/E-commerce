export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace?.(this, AppError);
  }
}

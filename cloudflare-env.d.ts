declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    WRITE_ENABLED: string;
    SUBMISSION_RATE_LIMITER: RateLimit;
  }
}

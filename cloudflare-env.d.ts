declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SPOTIFY_TOKEN_KEY?: string;
    MASTER_USER_EMAIL?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    RESEND_API_KEY?: string;
    ADMIN_EMAIL_FROM?: string;
  }
}

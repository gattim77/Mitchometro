# Mitchometro

Mitchometro compares a visitor's uploaded Spotify extended listening history with an admin-uploaded, private master history. It scores the comparison on a 0–120 scale, with the master set to 100, and shows strengths, weaknesses, and artist overlap. Without both uploads it shows a clearly marked demo.

There is no Spotify account connection, OAuth, Client ID, or Spotify API access. Each person requests their extended listening history from Spotify, extracts the ZIP, and uploads the music JSON files. The browser aggregates plays from the last 28 days, 6 months, and 12 months and sends the summary rather than the original files. The master upload also retains up to 500 track titles and artists for a random song display. Users can replace or delete their uploaded summaries. Migration 0004 removes the former OAuth tables, stored tokens, app credentials, and summaries created from the recently played API while preserving uploaded histories.

Visitors create a Mitchometro account with email/password or Google. Passwords are salted and hashed with PBKDF2; application sessions are opaque, hashed in D1, and stored in secure HTTP-only cookies. Google uses Authorization Code with PKCE. The public home page explains the product and shows a sample verdict before sign-in.

The `/admin` page is restricted to the account whose email matches `MASTER_USER_EMAIL`. That owner sets a separate password for the fixed `admin` username and enrolls a TOTP authenticator. `SPOTIFY_TOKEN_KEY` is retained only as the encryption key for admin TOTP data; it is unrelated to Spotify. Admin settings include artist bonuses and penalties and five editable sarcastic messages in each of twelve score bands.

The current admin can use **Nomina il nuovo Re** to create a 24-hour, one-time transfer link. The recipient must sign in with the invited email, choose a new password, and enroll a new TOTP authenticator. Completing enrollment replaces the admin identity and credentials, moves ownership of the private master upload, revokes every previous admin session, and signs in the new admin. When `RESEND_API_KEY` and `ADMIN_EMAIL_FROM` (a sender on a verified Resend domain) are configured, the app emails the link. Otherwise, it shows the link to the current admin for secure manual delivery.

## Development

## Cloudflare deployment

The application targets Cloudflare Workers and D1 and is suitable for the free tier. Node 22 or later is required.

1. Create a D1 database named `mitchometro`, put its database ID in `wrangler.json`, and run `npm run db:migrate:remote`.
2. Configure Worker runtime variables/secrets: `MASTER_USER_EMAIL`, `SPOTIFY_TOKEN_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally `RESEND_API_KEY` plus `ADMIN_EMAIL_FROM`.
3. In Google Cloud, register `https://mitchometro.third-ai.com/api/auth/google/callback` as an authorized redirect URI.
4. Connect the GitHub repository to Cloudflare Workers Builds on branch `main`. Set build command to `npm run build` and deploy command to `npx wrangler deploy --config dist/server/wrangler.json`.
5. The custom-domain route in `wrangler.json` attaches `mitchometro.third-ai.com`; Cloudflare creates its DNS record and certificate.

For local development, install dependencies, run `npm run db:migrate:local`, then `npm run dev`. Build with `npm run build` and verify with `npm run typecheck` and `npm run lint`.

Demo album artwork is externally hosted Apple Music artwork; source links are in `lib/tracks.ts`. The optional song search link opens Spotify's public search page without authenticating the visitor. No audio is streamed in the app.

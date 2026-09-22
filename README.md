# Mitchometro

Mitchometro compares a visitor's uploaded Spotify extended listening history with an admin-uploaded, private master history. It scores the comparison on a 0–120 scale, with the master set to 100, and shows strengths, weaknesses, and artist overlap. Without both uploads it shows a clearly marked demo.

There is no Spotify account connection, OAuth, Client ID, or Spotify API access. Each person requests their extended listening history from Spotify, extracts the ZIP, and uploads the music JSON files. The browser aggregates plays from the last 28 days, 6 months, and 12 months and sends the summary rather than the original files. The master upload also retains up to 500 track titles and artists for a random song display. Users can replace or delete their uploaded summaries. Migration 0004 removes the former OAuth tables, stored tokens, app credentials, and summaries created from the recently played API while preserving uploaded histories.

The `/admin` page is restricted to the single Sites account whose email matches `MASTER_USER_EMAIL`. That owner sets a password for the fixed `admin` username and enrolls a TOTP authenticator. The existing `SPOTIFY_TOKEN_KEY` runtime secret remains in use solely as the encryption key for admin TOTP data; it is not used for any Spotify connection. Admin settings include artist bonuses and penalties and five editable sarcastic messages in each of twelve score bands.

The current admin can use **Nomina il nuovo Re** to send a 24-hour, one-time transfer link. The recipient must sign in with the invited email, choose a new password, and enroll a new TOTP authenticator. Completing enrollment replaces the admin identity and credentials, moves ownership of the private master upload, revokes every previous admin session, and signs in the new admin. Transactional email uses Resend's HTTPS API and requires `RESEND_API_KEY` (secret) plus `ADMIN_EMAIL_FROM` (a sender on a verified Resend domain) in the Site runtime environment.

## Development

Node >=22.13. Install dependencies, apply D1 migrations, then run `node scripts/run-framework.mjs dev` or `node scripts/run-framework.mjs build`. The local preview needs the D1 binding and the admin runtime values to exercise admin authentication.

Demo album artwork is externally hosted Apple Music artwork; source links are in `lib/tracks.ts`. The optional song search link opens Spotify's public search page without authenticating the visitor. No audio is streamed in the app.

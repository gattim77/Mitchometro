# Mitchometro

Private Italian music dashboard inspired by the supplied visual reference. The dashboard's scores, strengths, matching, and sample tracks still use synthetic data. Live listening analysis is deliberately separate from the Spotify connection because [Spotify Developer Policy III.13](https://developer.spotify.com/policy) restricts derived listening metrics and benchmarking.

## Spotify connection

The site owner creates a Spotify Developer app at https://developer.spotify.com/dashboard and registers this exact redirect URI:

`https://mitchometro-music-lab.marcog77.chatgpt.site/api/spotify/callback`

Inside Mitchometro, the owner opens **Admin → Profilo master Spotify** and enters the app's client ID and secret. The secret is encrypted in D1; it must not be committed or pasted into chat. The owner can then connect the master profile. Each signed-in visitor can independently connect or disconnect their own Spotify profile. The master management control and all master data are restricted to the site's owner. The site remains private under its existing Sites access policy until the owner explicitly shares it.

OAuth uses Authorization Code with PKCE, a single-use 10-minute state bound to the authenticated Sites visitor, and the minimal `user-read-private` scope. Access and refresh tokens are encrypted using the hosted `SPOTIFY_TOKEN_KEY`. Token refresh is handled server-side; invalid refresh tokens remove the connection. Disconnect deletes connection data. The app reads `/me` only during connection and never sends the master identity or tokens to a visitor.

`SPOTIFY_REDIRECT_URI`, `MASTER_USER_EMAIL`, and the 32-byte `SPOTIFY_TOKEN_KEY` are hosted runtime values managed by Sites. They are not in source. D1 migrations create the connection, OAuth-attempt, developer-app settings, and evaluation settings tables. The server-gated `/admin` page is restricted to the single email configured as `MASTER_USER_EMAIL`; the corresponding API returns 404 to anyone else. The owner can set demo band bonuses/maluses (each −10 to +10, total adjustment capped at ±20) and edit five sarcastic message variants in each of twelve score ranges. Every analysis response picks a variant at random, and saved messages from the earlier five-range format are carried forward. These settings never expose the master connection to ordinary visitors and do not score Spotify listening data. The app's `/privacy` page explains the collected data and deletion controls.

## Development

Node >=22.13. `npm run install:ci`, `npm run db:generate` after schema changes, `npm run dev`, `npm run build`. The local preview needs D1 migrations and equivalent development environment values to exercise OAuth.

Album covers are externally hosted Apple Music artwork; source links are in `lib/tracks.ts`. No audio is streamed in the app.

# Mitchometro

Italian music-taste dashboard prototype based on the supplied visual reference.

## Status

This is a working sample-data application, not a live Spotify integration. No Spotify OAuth, tokens, personal data, or real baseline account are present. Spotify connection opens a truthful explanation of the pending integration. Before connecting real accounts, resolve Spotify Developer Policy III.13 (derived listening metrics and benchmarking), obtain baseline authorization, finalize the scoring model, and implement server-managed OAuth sessions and deletion/disconnection.

## Features

- Responsive dashboard, 0–120 score, server-side reference fixed at 100
- Three sample periods, strengths and improvement areas, aggregate genre matching
- Track selection, search, and favourites held only in current browser memory
- Accessible sidebar labels, dialogs, keyboard-operable tabs and period selector
- Invalid period validation, no-store API responses, loading/error/retry handling

`lib/server/analysis.ts` is imported only by `app/api/analysis/route.ts`; the client imports its TypeScript type only. The sample reference distributions are never returned by the API. Only aggregate results and synthetic user distributions are returned. This is data separation, not a claim that derived comparisons cannot reveal anything statistically about a reference.

## Score model (provisional)

Variety, discovery and identity are ratios to the reference capped at 120. Match is histogram intersection of genre distributions, 0–100. Overall score is rounded mean of the first three indicators × (0.8 + 0.2 × match/100). Comparing the reference with itself gives 100. Three indicators at 120 and match at 100 reach 120. All fixtures and conclusions are illustrative.

## Development

Node >=22.13. `npm run install:ci`, `npm run dev`, `npm run build`.

Album covers are externally hosted Apple Music artwork. Source links are recorded in `lib/tracks.ts`. No audio streams are embedded. Spotify links open searches in Spotify.

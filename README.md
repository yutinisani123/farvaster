# Farcaster Mini App Login Tool

Next.js mini app template for Farcaster with:

- Quick Auth login via `@farcaster/miniapp-sdk`
- backend token validation via `@farcaster/quick-auth`
- protected `/api/me` and `/api/action` demo endpoints
- Farcaster manifest at `/.well-known/farcaster.json`

## Requirements

- Node.js 22.11+ recommended
- npm, pnpm, yarn, or bun

## Local setup

1. Copy env file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start dev server:

   ```bash
   npm run dev
   ```

4. For Mini App testing, expose local server with `ngrok` or `cloudflared`, then set:

   - `NEXT_PUBLIC_URL`
   - `FARCASTER_APP_DOMAIN`

## Environment variables

- `NEXT_PUBLIC_URL`: public base URL for metadata, images, and manifest
- `FARCASTER_APP_DOMAIN`: audience/domain expected in Quick Auth JWT, for example `example.com`
- `FARCASTER_QUICK_AUTH_SERVER_ORIGIN`: custom Quick Auth server if you do not use the public one
- `FARCASTER_HOSTED_MANIFEST_ID`: optional hosted manifest ID from Farcaster Developer Tools; when set, `/.well-known/farcaster.json` redirects to the hosted manifest
- `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, `FARCASTER_SIGNATURE`: account association values for published app
- `NEYNAR_API_KEY`: optional, used to enrich profile response with username/display data

If account association env vars are omitted, the manifest still renders for local development, but you should provide real values before publishing the mini app.

## Publish flow

1. Deploy the app to a stable HTTPS domain.
2. Set `NEXT_PUBLIC_URL` and `FARCASTER_APP_DOMAIN` to that public domain.
3. Choose one manifest strategy:
   - Self-hosted manifest: generate `accountAssociation` values in the Farcaster manifest tool and set `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, and `FARCASTER_SIGNATURE`.
   - Hosted manifest: create a hosted manifest in Farcaster Developer Tools and set `FARCASTER_HOSTED_MANIFEST_ID`.
4. Verify that `https://your-domain/.well-known/farcaster.json` responds correctly.
5. Open the domain in Farcaster Developer Tools and complete publishing/discovery setup.

## Routes

- `/`: Mini App UI
- `/api/me`: validate Quick Auth token and return Farcaster user info
- `/api/action`: protected action demo
- `/.well-known/farcaster.json`: Farcaster Mini App manifest

## Notes

- In a normal browser, the app renders a safe fallback and does not crash.
- In Farcaster, the client calls `sdk.actions.ready()` and then authenticates with Quick Auth.
- This repo does not include installed dependencies because Node/npm were not available in the current environment while scaffolding.

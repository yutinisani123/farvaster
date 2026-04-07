# Farcaster Automation Vault

Next.js dashboard for local-first Farcaster account automation with:

- local encrypted vault for many accounts
- mnemonic/private-key import in the browser
- modular EVM transaction runner for miniapp-targeted flows
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

- `/`: Multi-account automation dashboard
- `/api/me`: validate Quick Auth token and return Farcaster user info
- `/api/action`: protected action demo
- `/.well-known/farcaster.json`: Farcaster Mini App manifest

## Notes

- The vault is stored only in local browser storage and encrypted with the password you enter in the UI.
- This project now acts as a local-first automation panel. A specific miniapp integration such as `Plinks` still requires the target contract/API details before full automation can be hardcoded.
- Publish-oriented PNG assets are generated in `public/` by `scripts/generate-assets.ps1`.

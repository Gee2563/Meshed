# Meshed World ID Build

This app is the World-enabled build target for Meshed. It preserves the VC network intelligence product model from the existing Meshed app:

- VC entities and portfolio/company graph context
- World ID registration for verified humans
- optional World wallet auth
- Meshed Agent recommendations
- verified interaction records and reward state
- optional World Chain logging for privacy-preserving interaction attestations

The existing `web_dev/` app remains read-only source context. New implementation lives here.

## Local Setup

```bash
cd meshed-world-miniapp
npm install
cp .env.example .env.local
npm run db:up
npm run db:push
npm run dev
```

For real World ID testing, set the World Developer Portal values in `.env.local` and update `NEXT_PUBLIC_APP_URL` to the public URL for this app.

## Demo Flow

1. Open Meshed.
2. Register or sign back in with World ID.
3. Connect the World wallet when wallet attestations are needed.
4. Select or create the VC context.
5. Let Meshed prepare the VC network graph.
6. Use Meshed Agent to recommend a verified intro or support action.
7. Record the verified interaction and reward state.

## Required Production Env

- `NEXT_PUBLIC_WORLD_APP_ID`
- `NEXT_PUBLIC_WORLD_RP_ID`
- `WORLD_RP_ID`
- `WORLD_RP_SIGNING_KEY`
- `SESSION_SECRET`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

World Chain logging also requires:

- `WORLD_CHAIN_RPC_URL`
- `WORLD_CHAIN_PRIVATE_KEY`
- `WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS`

OpenAI-powered agent responses require:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

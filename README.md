# Meshed

Meshed is a network intelligence layer for investment communities. It helps VCs, family offices, private equity firms, and curated ecosystems discover high-value connections across their portfolio or member base.

For the World Build version, Meshed now uses a World-native trust model:
- World ID verifies the humans behind key actions
- Meshed records human-backed interaction events in the database
- Agents are linked to verified humans who authorized them
- Rewards are tracked as value-distribution states, without token logic yet
- Flare is removed from the live demo path and isolated as legacy code

## World Build framing
Meshed is a human-verified coordination and value distribution layer for founders, employees, and agents.

Instead of proving that a data event was attested externally, Meshed now proves that important interactions were initiated, accepted, or completed by verified humans.

Examples of recorded interaction types:
- `MATCH_SUGGESTED`
- `INTRO_REQUESTED`
- `INTRO_ACCEPTED`
- `COLLABORATION_STARTED`
- `COLLABORATION_COMPLETED`
- `REWARD_EARNED`
- `REWARD_DISTRIBUTED`

## Repo structure
- `web_dev`: main Next.js app, API routes, Prisma schema, and demo UI
- `network_pipeline`: read-only data pipeline that generates network snapshots for the dashboard

## Core stack
- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma + Postgres
- World ID / IDKit for Meshed registration and human verification
- OpenAI Responses API for the founder agent experience

## Trust model
The live demo is intentionally DB-first for application state, with optional World Chain logging for verified interactions.

Meshed stores only privacy-preserving World verification references, such as:
- verification status
- nullifier-backed verification records
- verification-related badge state

Meshed does not store private identity data.

## World Chain logging
Meshed can optionally submit every verified interaction to `World Chain Sepolia` from the server and persist the returned transaction hash back into Postgres.

On-chain writes use:
- a minimal `VerifiedInteractionRegistry` contract
- hashed interaction references instead of private identity data
- the existing World ID verification state already stored by the app

Only privacy-preserving references are written on-chain:
- interaction id hash
- actor reference hash
- target reference hash
- company reference hash
- pain-point reference hash
- reward status
- verified flag
- metadata hash

## Local setup
Install dependencies:

```bash
cd network_pipeline
python3 -m venv venv
cd ../web_dev
npm install
```

Start the local database and sync Prisma:

```bash
cd web_dev
cp .env.example .env.local
npm run db:up
npm run db:push
```

To enable World Chain writes for the demo, add these values to `web_dev/.env.local`:

```bash
WORLD_CHAIN_RPC_URL=https://worldchain-sepolia.g.alchemy.com/public
WORLD_CHAIN_PRIVATE_KEY=your_funded_testnet_private_key
WORLD_CHAIN_CHAIN_ID=4801
WORLD_CHAIN_EXPLORER_TX_BASE_URL=https://worldchain-sepolia.explorer.alchemy.com/tx/
```

Then compile and deploy the interaction registry contract:

```bash
cd web_dev
npm run hardhat:compile
npm run hardhat:deploy:worldchain-sepolia
```

After deployment, add the printed contract address to `web_dev/.env.local`:

```bash
WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS=0x...
```

Keep using the same signer wallet for runtime writes after deployment, because the registry only accepts writes from its owner.

If you change World Chain env vars while the app is running, restart the Next.js server so the new config is picked up.

If you need a clean database state:

```bash
npm run db:reset
npm run db:push
```

## Demo flow
1. Register with World ID on the home page
2. Complete VC-first onboarding at `/onboarding`
3. Choose your VC, or add it manually with website and point of contact
4. If you are not onboarding as a VC member, add the company name and address you represent
5. Let Meshed queue the background network-preparation agent to inspect the VC site, generate a custom scraper, then map the portfolio, LPs, and public company signals
6. Register your social graph inputs, including LinkedIn, email, Slack, Teams, Twitter / X, calendar, and Instagram
7. Land on the dashboard as soon as the network is ready, or stay on the preparation screen until Meshed finishes
8. View recommended matches from the dashboard
9. Request or accept an intro
10. Record a verified interaction
11. Mark a reward as earned

The demo goal is simple:

> Every valuable intro, collaboration, and agent action is backed by verified humans through World ID.

## Founder agent
Meshed also includes a founder-facing chatbot route at `web_dev/app/chatbot` that now supports a richer “verified AI Doppelganger” flow.

The current implementation:
- keeps the existing deterministic graph intelligence as a reliable fallback
- layers an OpenAI-powered founder agent on top when `OPENAI_API_KEY` is configured
- personalizes replies with founder context, company memberships, and recent verified interactions
- classifies answers into `Individual`, `Ecosystem`, or `Resilience`

Set these env vars in `web_dev/.env.local` to enable the OpenAI path:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

If `OPENAI_API_KEY` is missing, the chatbot still works in deterministic graph-fallback mode.

## Onboarding agent
The live onboarding flow now starts at `web_dev/app/onboarding` after World registration.

It is designed to be asynchronous:
- Step 1 captures the user&apos;s VC, website, and point of contact
- Non-VC members also add the company name and address they represent
- Meshed immediately queues a background network-preparation job
- The job runs `network_pipeline/scripts/scrape_vc_network.py`
- It first checks the VC website for portfolio / investments / people-style links, learns the repeated page pattern, and writes a generated site-specific scraper to `network_pipeline/generated/vc_scrapers`
- That generated scraper then looks for portfolio companies, LP / advisor contacts, and follows portfolio websites for public news and team signals when available
- Step 2 captures the social systems the founder wants their Meshed agent to use
- Once the network-preparation job reaches `READY`, the user is routed to the dashboard

For custom VCs that are not part of the built-in demo snapshots, the dashboard falls back to a summary view based on the scraped network-preparation result until a richer graph bundle is generated.

## Verifying on-chain writes
When World Chain logging is enabled:
- every verified interaction stores a `transactionHash`
- the profile and dashboard surfaces show the tx hash and explorer link
- `metadata.worldChain` stores the contract address, block number, explorer URL, and hashed payload references used for the write

You can verify a transaction in two ways:

1. In the UI, open the tx link shown next to the recorded interaction.
2. In Postgres or Prisma Studio, inspect the `VerifiedInteraction.transactionHash` field and the `metadata.worldChain` object.

For the runtime demo, the server will only submit on-chain transactions when:
- the actor requirements for a verified interaction are met
- `WORLD_CHAIN_PRIVATE_KEY` or `PRIVATE_KEY` is configured
- `WORLD_CHAIN_VERIFIED_INTERACTION_REGISTRY_ADDRESS` is configured

If those values are missing, the app still records the interaction in Postgres but skips the on-chain write.

## Notes
- Dynamic remains in the repo only as legacy code while the live onboarding path now runs entirely through World ID.
- Legacy Flare contracts, scripts, and adapters remain in the repo for reference, but the World Build demo no longer depends on them at runtime.
- The server signer wallet must have `World Chain Sepolia ETH` before contract deployment or interaction writes will succeed.

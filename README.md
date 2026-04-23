# Meshed
EthGlobal Cannes 2026 Hackathon :)


Welcome to Meshed - 

We aim to  develop a full stack application that leverages World, Flare and Dynamic to onboard, verify and attests users and their credentials on our platform.

Meshed is aimed to improve relationships within VC communities, by find companies and people with commonalities, who can assist each other and help improve the overall VCs ecosystem

MVP requirements:

We'll use a TDD approach.

Front end with
- Landing page,
- Registration page using Dynamic 
- Onboarding page + World ID for human verification
- Dashboard showing people to connect + logics for  Flare attestations (TBD)

Back-end needs to include:
- Network logic (for MVP we're thinking of a simple cosine similarity graph)
- Registration Logics
- Connectors for all 3 blockchains
- DB logic to store user credentials, including transaction hashes

Team:
- Tani Monique Gaan
- George Smith

Installing project:

cd network_pipeline
python3 -m venv venv
cd ../web_dev
npm install

Quick local DB setup (for /api/auth routes):

cd web_dev
[ -f .env.example ] && cp .env.example .env.local
[ -f .env.local ] || touch .env.local
npm run db:setup

If you prefer manual steps:
npm run db:up
npm run db:push

If you need a clean DB state:

npm run db:reset
npm run db:push

Refresh Flexpoint Ford network graph (scrape then build):

cd network_pipeline
source venv/bin/activate
./scripts/run_flexpointford_pipeline.sh



TODOS:
Press/News release:
-------------------

1) Identify best sources for PRs:
    - Company website + scrape?
    - APIs  / RSS feeds?
    - Latest press can be added by the IG (if they have someone in charge of comms)

2) Implement on the following logics:
    -  FE: card "Latest news"  on click to modal with titles of article, on click to 3rd party article url

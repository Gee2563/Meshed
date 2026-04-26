# AGENTS.md

## Repository Context

This repository contains the existing Meshed VC-focused codebase and a new World Mini App version.

The existing Meshed code may be read for:
- product context
- naming
- network graph logic
- mock data structure
- UI inspiration
- existing Meshed concepts

The existing Meshed code must not be modified unless explicitly requested.

## New Build Target

All new implementation should live inside:

meshed-world-miniapp/

This is the new World Mini App version of Meshed.

## Product Reframe

Old Meshed:
- built for VC ecosystems
- portfolio intelligence
- founders, LPs, advisors, mentors, hiring, talent recycling

New Meshed for World:
- built for the World Mini App ecosystem
- helps verified World users discover Mini Apps, builders, rewards, communities, events, and opportunities
- gives every verified user a Meshed Agent, their AI Doppelgänger
- routes value to verified humans for useful actions
- recirculates unused talent, incentives, abandoned Mini Apps, and dormant communities through Meshed Upcycled

## Core Product Definition

Meshed for World is the human-verified discovery and value-routing layer for the World Mini App ecosystem.

Meshed turns the World Mini App ecosystem from a list of apps into a living, human-verified coordination network.

## Feature Pillars

1. Meshed Agents
- AI Doppelgängers for verified World users
- recommend Mini Apps, people, builders, rewards, events, and opportunities
- answer user questions
- draft messages
- coordinate via World-native communication flows where possible

2. Value Distribution
- rewards verified humans for meaningful actions
- examples: trying Mini Apps, giving feedback, referring verified humans, joining communities, completing onboarding

3. Meshed Upcycled
- recirculates unused value across World
- examples: inactive builder talent, abandoned Mini App ideas, unused reward pools, dormant communities, unfinished integrations

## Build Rules

- Build inside meshed-world-miniapp/
- Do not modify existing VC Meshed folders
- If you need context from old Meshed code, read it and summarize the relevant idea before using it
- Do not copy VC-specific positioning into the World Mini App
- Do not mention LPs, PE firms, family offices, or VC portfolio SaaS in the World app UI
- Keep implementation hackathon-ready and mobile-first

## World Integration Direction

Build as a real World Mini App from the start where practical.

Use:
- MiniKit for the Mini App shell
- IDKit for World ID / Proof of Human verification
- World-native share/chat/commands where supported
- mock data for Meshed Agent responses, rewards, recommendations, and Upcycled flows

If a real World integration requires credentials, create the structure and clearly document required environment variables.

## Design Direction

Dark, modern, mobile-first UI.

Make it feel like:
- World App
- Linear
- Stripe

Use:
- deep navy / black background
- purple and cyan accents
- rounded cards
- verified human badge
- clear demo flow
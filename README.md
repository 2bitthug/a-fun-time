# A Fun Time — React + Vite

A dark, mobile-friendly interactive playground combining public data sources, a self-contained play-money poker game, and a Supabase-powered community area for user search, connections, and private chat.

## Requirements

- Node.js 18+ recommended
- npm
- Internet access for the external services
- A configured Supabase project for accounts and community features

## Install and run

Run these commands from the project folder:

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite.

For a production build:

```bash
npm run build
```

## Current integrations

- Pokémon data service — Pokémon lookup.
- Radio Browser — rock station directory.
- DummyJSON Quotes — random quote.
- random word services — random word fallback chain.
- Tradestie — Reddit WallStreetBets sentiment; the endpoint is updated about every 15 minutes.
- Lichess — public player profile lookup.
- JustMeme — random meme template.
- Poker — local game logic; no external poker service or real money.
- Community — Supabase profiles, connection requests, and private messages.

The UI does not invent replacement data. If an external source fails, the relevant card shows a plain-language error and a retry action where appropriate.

## Supabase

See `README-SUPABASE.md` for authentication, database, and environment-variable setup.

Never put a Supabase service-role/secret key in the frontend.

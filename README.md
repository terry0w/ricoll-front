# Ricoll — Web

Web client for **Ricoll**, an app for managing your collection and building decks for the
[Riftbound](https://riftbound.leagueoflegends.com/) trading card game. I built it as my final project
(TFG) for the **DAM** degree (Desarrollo de Aplicaciones Multiplataforma).

> Backend (NestJS API): [terry0w/ricoll-back](https://github.com/terry0w/ricoll-back)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?logo=reactrouter&logoColor=white)

<!-- Screenshots: add a few images to docs/ and uncomment
![Catalog](docs/catalog.png)
![Deck builder](docs/deck-builder.png)
-->

## Features

| Section | What it does |
|---|---|
| **Catalog** | Browse every card with images, market prices and filters by set, rarity, domain and type. |
| **My collection** | Add and remove copies of each card and variant (normal, foil…) and see your inventory. |
| **Deck builder** | Pick a legend, and the card and rune pools are filtered to the legend's domains automatically (signature cards only appear for their champion). Shows a live counter for main deck (40), runes (12), battlefields (3) and sideboard. |
| **Deck detail** | The list grouped by card type, version history, and toggles to publish or unpublish. |
| **Match results** | Log events (casual game, Nexus Night, store tournament…) with the opponent's legend and the result of each round. Results are color-coded and the win rate updates automatically. |
| **Public decks** | Explore other players' decks with search. Compares the list with **your collection**, shows **the cards you're missing**, and gives an estimated cost. |
| **Proxy generator** | Make print-ready A4 PDFs with cards at the real size (63×88 mm, 3×3 grid), built in the browser with jsPDF. |
| **Accounts** | Register, log in, **log in with Google**, verify your email and recover your password. |

## Tech stack and structure

- **React 19 + TypeScript**, built and served by **Vite**.
- **React Router 7** for client-side navigation.
- **Context API** (`AuthContext`) for global session state. The JWT is kept in `localStorage`, and the
  session is restored when the app loads.
- **jsPDF** to generate the proxy PDFs on the client.
- Hand-written CSS with custom properties (design tokens), the Inter font and a glass-style navbar.
  No UI framework.
- During development, the Vite proxy forwards `/api/*` to the backend, so there are no CORS issues.

```
src/
├── main.tsx / App.tsx      # entry point and route table
├── contexts/AuthContext.tsx
├── components/Navbar.tsx
├── pages/                  # one page per route
│   ├── LandingPage, CatalogPage, CollectionPage
│   ├── DecksPage, DeckBuilderPage, DeckDetailPage
│   ├── PublicDecksPage, PublicDeckDetailPage
│   ├── ProxyPage
│   └── Login / Register / ForgotPassword / ResetPassword / GoogleCallback
└── assets/                 # hero image and domain/rarity icons
```

### Routes

| Route | Page |
|---|---|
| `/` | Landing page |
| `/catalog` | Card catalog |
| `/collection` | My collection |
| `/decks` · `/decks/new` · `/decks/:id` · `/decks/:id/edit` | My decks, builder and detail |
| `/decks/explore` · `/decks/public/:id` | Public decks |
| `/proxy` | Proxy generator |
| `/login` · `/register` · `/forgot-password` · `/reset-password` · `/auth/callback` | Authentication |

## Running locally

**Requirements:** Node.js 20+ and the [backend](https://github.com/terry0w/ricoll-back) running on
`http://localhost:3000`.

```bash
yarn install     # or npm install
yarn dev         # http://localhost:5173
```

| Command | Description |
|---|---|
| `yarn dev` | Development server with HMR |
| `yarn build` | Type-check (`tsc -b`) and production build |
| `yarn preview` | Serve the production build |
| `yarn lint` | ESLint |

## Roadmap

- [ ] Shared typed API client (to remove repeated `fetch` calls) and better loading/error handling
- [ ] Split the largest pages (deck builder and deck detail) into reusable components
- [ ] Component tests with Vitest + Testing Library
- [ ] Responsive design for mobile
- [ ] Deployment (Vercel/Netlify) with a public demo

## Disclaimer

Riftbound and its assets are the property of Riot Games. This is an educational project with no
commercial purpose and no affiliation with Riot Games.

## Author

**Alonso Muñoz** · [GitHub @terry0w](https://github.com/terry0w)

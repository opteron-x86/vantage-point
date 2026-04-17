# Frontend

Next.js 14 (App Router) + TypeScript + Tailwind. Nord dark theme.

## Setup

```bash
cd frontend
cp .env.local.example .env.local    # point NEXT_PUBLIC_API_URL at your backend
npm install
npm run dev
```

Open http://localhost:3000 and log in with the user created via the backend `create_user` script.

## Layout

```
src/
├── app/                 Next.js App Router pages
├── components/          Grouped by feature domain (watchlist/, briefing/, chat/, ticker/)
├── lib/
│   ├── api/             Typed API clients (one file per backend domain)
│   ├── hooks/           React hooks (useAuth, useWatchlist, etc.)
│   ├── stores/          Zustand stores for global client state
│   ├── types/           Shared TS types
│   └── utils/           Pure helpers (format, dates)
└── styles/              Tailwind globals + Nord CSS variables
```

## Design system

- **Colors:** Nord palette via CSS variables (see `styles/globals.css`)
- **Typography:** Inter Display for UI chrome, JetBrains Mono for prices/data
- **Components:** Feature-grouped. Primitives live in `components/ui/`.
- **State:** TanStack Query for server state, Zustand for the small amount of truly global client state (auth), local `useState` for everything else.

# Pixel Perfect Pixels

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd021e05-4112-49cd-abe5-4962f7464cf1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Architecture

Plain **Vite + React** single-page app — no SSR, no server runtime.

- Routing: [React Router](https://reactrouter.com) (`src/App.tsx`) — `/`, `/app`, `/signin`, `/signup`
- Auth: Supabase JS client in the browser (`src/integrations/supabase/client.ts`)
- Styling: Tailwind CSS v4 (`src/styles.css`)

```sh
bun install        # or npm i
bun run dev        # http://localhost:5173
bun run build      # static output in dist/
bun run preview    # serve dist/ locally
```

Backend: the project's own Supabase project (`pzfftktblqxjdrsfeiit`). Required env vars
(inlined at build time, see `.env.example`):

```sh
VITE_SUPABASE_URL="https://pzfftktblqxjdrsfeiit.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."   # browser-safe, RLS-gated (replaces the old anon key)
```

## Deploy to Vercel

Import the repo in Vercel — `vercel.json` sets the Vite framework preset, `dist/` output,
and a catch-all rewrite to `index.html` so deep links like `/app` resolve client-side.
Add the two `VITE_SUPABASE_*` variables under Project → Settings → Environment Variables,
and add your Vercel domain (e.g. `https://<project>.vercel.app/app`) to the Supabase Auth
redirect URL allow-list so sign-up confirmation emails land correctly.

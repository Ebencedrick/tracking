# Package Pilot Tracker

React app hosted by Next.js 16. The existing React Router routes are retained inside a Next.js catch-all page for compatibility. The Express API remains a separate process and continues to own the Mongoose connection and MongoDB data.

## Requirements

- Node.js 20.9 or newer
- npm

## Local development

Install dependencies:

```powershell
npm install
```

Run the API and web app in separate terminals:

```powershell
npm run server:dev
```

```powershell
npm run dev
```

The Next.js app runs at `http://localhost:3000`; the Express API defaults to `http://localhost:5000`.

## Environment

- `MONGODB_URI`: MongoDB connection string read by the Express server. Keep the existing value to continue using the same database.
- `API_PROXY_TARGET`: optional Express API origin for Next.js rewrites; defaults to `http://localhost:5000`.
- `NEXT_PUBLIC_API_URL`: optional direct API base URL, used instead of the `/api` rewrite.
- `NEXT_PUBLIC_SERP_API_KEY`: optional SerpApi key used by the map search integration.

For deployment, configure `API_PROXY_TARGET` to a reachable Express API service. The database remains connected from that backend, not from the browser.

## Production

```powershell
npm run build
npm start
```

Start the Express backend separately with `npm run server`.
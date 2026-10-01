# Package Pilot Tracker

React app hosted by Next.js 16. The existing React Router routes are retained inside a Next.js catch-all page for compatibility. Express and Mongoose continue to own the MongoDB connection and data.

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
- `API_PROXY_TARGET`: optional local Express API origin for Next.js development rewrites; defaults to `http://localhost:5000`.
- `NEXT_PUBLIC_API_URL`: optional direct API base URL, used instead of the `/api` rewrite.
- `NEXT_PUBLIC_SERP_API_KEY`: optional SerpApi key used by the map search integration.

On Vercel, `api/index.js` exposes the Express API as a serverless function. Set `MONGODB_URI` in the Vercel project environment; database access stays server-side and does not come from the browser.

## Production

```powershell
npm run build
npm start
```

Start the Express backend separately with `npm run server`.
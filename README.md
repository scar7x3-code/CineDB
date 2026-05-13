# CineDB

Minimal movie and series catalog backed by the [OMDb API](https://www.omdbapi.com). This app is a small **Node.js** server that keeps your API key off the client. It is not deployable as static GitHub Pages alone (there must be a server process).

## Requirements

- Node.js 18+ (uses global `fetch`)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in this directory:

   ```env
   API_KEY=your_omdb_api_key
   PORT=3000
   ```

   The server exits on startup if `API_KEY` is missing or blank.

3. Run:

   ```bash
   npm run dev
   ```

   Or production-style:

   ```bash
   npm start
   ```

   Open `http://localhost:3000` (or your chosen `PORT`).

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm start`   | Run `node server.js` |
| `npm run dev` | Run with nodemon   |

## Deploying

Use any host that runs Node (Render, Fly.io, Railway, VPS, etc.). Set `API_KEY` (and optionally `PORT`) in the host environment. Use HTTPS in production.

## License

See the parent repository for licensing.

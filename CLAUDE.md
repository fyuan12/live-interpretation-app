# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A real-time English ↔ Chinese interpretation tool for LDS church meetings. An interpreter speaks into a microphone; their words are transcribed, translated, and broadcast live to congregation members on a read-only audience view.

## Running the App

```bash
npm install
npm start          # starts server at http://localhost:8000
```

Requires a `.env` file (see `.env.example`) with four variables: `APP_PASSWORD`, `JWT_SECRET`, `GOOGLE_TRANSLATE_API_KEY`, `DEEPGRAM_API_KEY`.

There are no tests and no linter configured.

## Architecture

The app has two distinct user roles served from one Express server:

- **Interpreter view** (`/` → `index.html` + `app.js`): password-protected, controls speech capture and translation
- **Audience view** (`/view` → `audience.html` + `audience.js`): public, read-only, receives updates via WebSocket

### Request / data flow

1. Interpreter logs in via `POST /api/auth/login` → server creates an in-memory **room** and returns a JWT + a 6-character `roomId`
2. Interpreter connects to Deepgram's cloud STT service directly from the browser over `wss://api.deepgram.com` using a key fetched from `GET /api/config/deepgram` (the key never ships in HTML)
3. Deepgram returns final transcripts; the browser calls `POST /api/translate` on the Express server
4. The server injects LDS glossary terms as `[Tn]` placeholders, calls Google Cloud Translation v2, then restores the placeholders with canonical LDS translations before returning the result
5. Translated sentences are pushed over a second WebSocket (`/ws?room=<id>&role=interpreter`) to the Express server
6. Express relays each sentence to all connected audience WebSocket clients (`/ws?room=<id>&role=audience`)

### Server (`server.js`)

- Runs an HTTP server + a `ws` WebSocket server on the same port
- Room state (`interpreterWs`, `audienceWs` Set, `state`) is stored in a `Map` in memory — **rooms are lost on server restart**
- JWT middleware (`authenticateToken`) guards all `/api/*` routes except `/api/room/:roomId`
- `POST /api/translate` is the translation endpoint: applies server-side LDS glossary term injection, calls Google Cloud Translation v2, then restores placeholders
- Legacy DeepL proxy routes (`/api/deepl/*`, `/api/deepl-glossary`) remain in the code but are no longer called by the client
- Rooms are cleaned up hourly when both interpreter and all audience clients have disconnected

### Client — Interpreter (`app.js`)

Single class `LiveInterpreter`. Key state:
- `authToken` / `roomId` — stored in `sessionStorage` (cleared on tab close)
- `deepgramKey` — fetched after login, held only in memory
- `direction` — `'en-to-zh'` or `'zh-to-en'`, persisted in `localStorage`
- `broadcastSocket` — WebSocket to `/ws` as role `interpreter`; auto-reconnects every 3 s

On login: fetches Deepgram key, then immediately opens the broadcast WebSocket (no glossary setup step — glossary is handled server-side).

On "Start Listening": requests microphone, opens a WebSocket to `wss://api.deepgram.com`, starts a `MediaRecorder` that chunks audio every 250 ms and sends chunks to Deepgram. Final transcripts trigger translation then a `sentence` message to the server WebSocket.

Font settings are CSS-variable–based, stored in `localStorage`, swapped depending on direction (left/right panels swap language assignment when direction changes).

### Client — Audience (`audience.js`)

Single class `AudienceView`. Connects to `/ws?room=<id>&role=audience` with exponential-backoff reconnection (max 10 attempts, up to 30 s delay). On connect the server immediately sends an `init` message with the full current state. Subsequent `sentence`, `status`, and `clear` messages keep the view in sync. Font settings are audience-local and stored in `localStorage`.

### WebSocket message protocol

| Sender | Type | Payload |
|--------|------|---------|
| interpreter → server | `status` | `{ isListening, direction }` |
| interpreter → server | `sentence` | `{ source, target }` |
| interpreter → server | `clear` | — |
| server → audience | `init` | `{ state, interpreterConnected }` |
| server → audience | `status` | `{ isListening, direction, interpreterConnected }` |
| server → audience | `sentence` | `{ source, target }` |
| server → audience | `clear` | — |

### Glossary (`glossary.js`)

Exports `LDS_GLOSSARY` — an array of 748 `[english, chinese]` pairs, covering priesthood, ordinances, organizations, scriptures, and LDS-specific vocabulary. The file is loaded both in the browser (via `<script>` tag, sets a global) and on the server (via `require()`).

**Term injection** (server-side, `server.js`): Before each translation request the server scans the source text for glossary terms, replaces matches with `[T0]`, `[T1]`, … placeholders, sends the modified text to Google Translate, then substitutes the placeholders back with the canonical LDS translations from the glossary. Terms are sorted longest-first to prefer specific matches (e.g. "Melchizedek Priesthood" before "priesthood"). ZH→EN deduplicates on the Chinese side.

## Deployment

Docker is supported (`Dockerfile` uses `node:20-alpine`). Web Speech API is replaced by Deepgram, so **any modern browser works** — Chrome is no longer required. HTTPS is still recommended in production (needed for microphone access via `getUserMedia` on non-localhost origins).

Environment variables must be set at runtime; they are never baked into client-side code.

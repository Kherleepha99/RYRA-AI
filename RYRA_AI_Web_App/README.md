# RYRA AI Web Application

A responsive, browser-based starter for RYRA AI with Hausa/English voice input, spoken replies, and safe quick actions.

## Features
- Responsive web UI for phone and desktop
- Voice input via browser Web Speech API (browser/device support varies)
- Hausa and English language selector
- Spoken responses using browser speech synthesis
- Online AI chat through a Node.js backend
- Quick actions: open phone dialer, WhatsApp, Facebook, and YouTube
- AI API key remains on the backend

## Important limitations
- This web app does not implement always-on "Hey RYRA". Browsers generally do not allow a website to keep the microphone listening in the background reliably. Use the microphone button.
- Speech recognition is most consistently supported in Chrome-based browsers; Hausa recognition availability depends on the browser's speech service.
- A website cannot freely control the Android or Windows operating system.
- The app opens WhatsApp/Facebook links but does not silently send messages or place calls. Use official supported integrations and user confirmation for those features.
- Use HTTPS for deployed production sites. Do not expose your AI API key in frontend JavaScript.

## Requirements
- Node.js 20+
- An AI provider account/key compatible with an OpenAI-style Chat Completions API

## Run locally
1. Open a terminal in this folder.
2. Copy `backend/.env.example` to `backend/.env`.
3. Put your provider key in `AI_API_KEY` and a model name supported by your provider in `AI_MODEL`.
4. Run:
   ```bash
   cd backend
   npm install
   npm start
   ```
5. Open `http://localhost:3000` in Chrome.
6. Allow microphone access when prompted.

The server hosts both the web app and `/api/chat`.

## Deploy
Deploy this project to a Node.js host that supports a persistent Express server, or adapt the API route for your hosting provider. Set `AI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL` as server-side environment variables. Set a valid HTTPS domain for production.

## Test
- Click the microphone and say “Sannu RYRA” or “Hello RYRA”.
- Switch language and try English/Hausa.
- Type a message if speech recognition is unavailable.
- Click quick actions to open dialer or social apps.
- Without a configured API key, chat returns a configuration error by design.

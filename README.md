# Portfolio explorer — Gemini setup

The portfolio explorer uses Gemini when configured and automatically falls back to its built-in keyword matcher when the API is not configured, unavailable, or rate-limited.

## Configure the free Gemini API tier

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key in a project on the Gemini API Free Tier.
2. In your Vercel project, open **Settings → Environment Variables**.
3. Add `GEMINI_API_KEY` with the API key value. Select the environments you deploy to (Production, Preview, and/or Development).
4. Optionally add `GEMINI_MODEL` to override the default model. The default is `gemini-3.1-flash-lite`; verify current free-tier model availability and quotas in Google AI Studio.
5. Redeploy the project so the function receives the new environment variable.

The key is read only by `api/chat.js`; it is never sent to the browser. Do not put it in `index.html`, a public environment variable, or a committed `.env` file.

## Fallback behavior

- Missing API key or unavailable Gemini service: use keyword-based portfolio matching.
- Gemini HTTP 429 / `RESOURCE_EXHAUSTED`: show a quota notice and use keyword matching.
- Empty or invalid API response / network failure: use keyword matching.
- Questions are limited to 1,000 characters and Gemini output is capped at 300 tokens.

Gemini Free Tier has model-specific rate limits (requests per minute, input tokens per minute and requests per day). These are managed by Google and can change; check the active limits in AI Studio. The fallback handles quota errors but does not guarantee a fixed number of free requests.

## Privacy note

Google's Gemini API Free Tier terms indicate that submitted content may be used to improve Google's products. This endpoint sends the visitor's question and the portfolio's public professional context to Gemini. Do not add private or confidential information to the prompt context while using the Free Tier.

## Local development

Use Vercel's local development workflow and set `GEMINI_API_KEY` in your local environment (or in an uncommitted local `.env` file). Never commit the key.

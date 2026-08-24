# Kibi — AI Travel Planner

A static, client-side travel planning demo built with plain HTML, Tailwind CSS, and vanilla JavaScript. Served locally with Python.

## Local Development

```bash
cd "/Users/chetanrajgoyal/Desktop/project bee"
python3 server.py
```

Then open http://localhost:8081 in your browser.

## Authentication

This demo uses client-side OAuth (Google Identity Services and Sign in with Apple) and stores the resulting session in `localStorage`.

> **Security note:** Tokens are stored in `localStorage` for evaluation/demo purposes only. This is not safe for a production app with real user data. The recommended production approach is server-side verification with HttpOnly cookies or server-side sessions. See `.env.example` for the credentials you would configure on the backend.

### localStorage keys

- `kibi_auth_user` — unified active session object (`provider`, `name`, `email`, `avatar`, `token`, `id`)
- `kibi_users` — registered local users (including social sign-ins)
- `kibi_current_user` — legacy ID pointer kept for compatibility

### Google setup

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Web application client ID.
3. Add `http://localhost:8081` to Authorized JavaScript origins.
4. Copy `.env.example` to `.env` and set `GOOGLE_CLIENT_ID`.

### Apple setup

1. Register a Services ID at https://developer.apple.com/account/resources/identifiers/list/serviceId
2. Enable "Sign in with Apple" and configure the redirect URI.
3. Apple requires HTTPS for the redirect URI, so local testing needs a tunnel such as ngrok:
   ```bash
   ngrok http 8081
   ```
4. Copy `.env.example` to `.env` and set `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, and `APPLE_REDIRECT_URI`.

## Project Structure

- `index.html` — landing page
- `login.html`, `signup.html` — authentication pages
- `dashboard.html`, `discover.html`, `plan-trip.html`, `my-trips.html`, `profile.html` — app pages
- `js/` — shared modules (`auth.js`, `storage.js`, `config.js`, `app.js`, etc.)
- `server.py` — local static development server

# Kibi — AI-Powered Travel Planner

**Kibi** is a modern, client-side travel planning web application that helps users discover destinations, build personalized itineraries, and manage their trips — all from a clean, responsive interface. Built with plain HTML, Tailwind CSS, and vanilla JavaScript, it runs entirely in the browser and is optimized for easy deployment on static hosts like **Vercel**.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Kibi simplifies travel planning by combining destination discovery, AI-style itinerary generation, and personal trip management into one seamless experience. Users can browse curated destinations, plan trips with intelligent suggestions, save itineraries, and track their travel stats from a personalized dashboard.

The app is designed to be:

- **Fast** — no build step, no heavy framework overhead
- **Responsive** — works smoothly on mobile, tablet, and desktop
- **Accessible** — semantic HTML, keyboard-friendly navigation, ARIA labels
- **Theme-aware** — full light and dark mode support

---

## Live Demo

Deployed at: [https://kibi-rose.vercel.app](https://kibi-rose.vercel.app)

> Replace the link above with your actual Vercel deployment URL.

---

## Key Features

- **Homepage** — Hero discovery flow with featured destinations, travel stats, and clear CTAs.
- **Discover** — Browse destinations with filters, search, and a featured-destination slider.
- **Plan a Trip** — Multi-step trip planner that generates day-by-day itineraries based on destination, dates, budget, travel style, and companions.
- **Itinerary View** — Beautiful day-by-day schedule with activities, maps, and budget breakdown.
- **My Trips** — Central list of all planned and past trips.
- **Dashboard** — Personalized profile, travel stats, saved itineraries, and quick actions.
- **Saved Itineraries** — Bookmark community or generated itineraries for later.
- **Dark Mode** — System-aware and manually toggleable dark theme across every page.
- **Authentication** — Google OAuth and local account support with client-side session management.
- **Mobile-First Navigation** — Global pill-style navbar with animated mobile menu.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Markup | HTML5 (semantic, accessible) |
| Styling | Tailwind CSS via CDN + custom design tokens |
| Fonts & Icons | Google Fonts (Inter, Plus Jakarta Sans, Be Vietnam Pro), Material Symbols, Font Awesome |
| Logic | Vanilla JavaScript (ES6+) |
| State | `localStorage` for sessions, users, trips, and saved itineraries |
| Animation | Custom CSS transitions + GSAP for scroll/entrance effects |
| Deployment | Vercel (static site hosting) |

---

## Project Structure

```text
Kibi/
├── index.html              # Landing page
├── discover.html           # Destination discovery & filters
├── plan-trip.html          # Trip planning wizard
├── itinerary.html          # Generated trip itinerary
├── my-trips.html           # All user trips
├── dashboard.html          # User profile & stats
├── saved-itinerary.html    # View saved community itineraries
├── login.html              # Login page
├── signup.html             # Registration page
├── about.html              # About / team page
├── assets/                 # Images, icons, illustrations
├── js/                     # Shared JavaScript modules
│   ├── app.js              # Global navbar, footer, theme, auth dropdown
│   ├── auth.js             # OAuth and local auth logic
│   ├── storage.js          # localStorage helpers and data models
│   ├── trips.js            # Trip rendering and itinerary logic
│   ├── matching.js         # Destination matching engine
│   ├── animations.js       # Scroll/entrance animations
│   └── config.js           # App configuration and API keys
├── css/                    # Additional stylesheets (if any)
├── server.py               # Local static development server
├── .env.example            # Example environment variables
└── README.md               # You are here
```

---

## Getting Started

### Prerequisites

- A modern web browser
- Python 3.x (for local dev server)
- (Optional) A Vercel account for deployment

### Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/Bhargav-bit567/Kibi.git
   cd Kibi
   ```

2. Start the local static server:

   ```bash
   python3 server.py
   ```

3. Open your browser at:

   ```text
   http://localhost:8081
   ```

> The default port is `8081`. If it is busy, the server will suggest an alternate port.

---

## Authentication

Kibi supports two authentication paths:

1. **Google OAuth** via Google Identity Services
2. **Local accounts** with email and password

Session data is stored in the browser using `localStorage` for demo purposes.

> **Security note:** Storing tokens in `localStorage` is **not recommended** for production apps handling real user data. For production, use server-side verification with HttpOnly cookies or server-side sessions.

### localStorage keys

| Key | Purpose |
|-----|---------|
| `kibi_auth_user` | Active session object (`provider`, `name`, `email`, `avatar`, `token`, `id`) |
| `kibi_users` | Registered local users and linked social accounts |
| `kibi_current_user` | Legacy user ID pointer |
| `kibi_theme` | User's light/dark theme preference |

### Google setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Web application** client ID.
3. Add `http://localhost:8081` to **Authorized JavaScript origins**.
4. Copy `.env.example` to `.env` and set `GOOGLE_CLIENT_ID`.

### Apple setup

1. Register a **Services ID** in your [Apple Developer account](https://developer.apple.com/account/resources/identifiers/list/serviceId).
2. Enable **Sign in with Apple** and configure the redirect URI.
3. Apple requires HTTPS for the redirect URI, so local testing needs a tunnel such as ngrok:

   ```bash
   ngrok http 8081
   ```

4. Copy `.env.example` to `.env` and fill in `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, and `APPLE_REDIRECT_URI`.

---

## Deployment

### Deploy to Vercel

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Keep the default settings (framework preset: **Other**, output directory: `./`).
4. Add any required environment variables from `.env.example`.
5. Click **Deploy**.

Because Kibi is a static site, no build command is required.

---

## Screenshots

### Home

> ![Home page screenshot](assets/screenshots/home.png)
> *Hero section with destination search and featured travel highlights.*

### Discover

> ![Discover page screenshot](assets/screenshots/discover.png)
> *Browse destinations with filters, search, and trending cards.*

### Plan Trip

> ![Plan Trip page screenshot](assets/screenshots/plan-trip.png)
> *Multi-step planner for dates, budget, travel style, and companions.*

### Dashboard

> ![Dashboard page screenshot](assets/screenshots/dashboard.png)
> *Personal profile, travel stats, saved trips, and quick actions.*

> **Note:** Place your actual screenshots in `assets/screenshots/` and update the file names above to match.

---

## Environment Variables

Copy `.env.example` to `.env` and configure the values:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
APPLE_REDIRECT_URI=https://your-domain.com/auth/apple/callback
```

---

## Contributing

Contributions are welcome. If you find a bug or want to improve a feature:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`.
3. Make your changes and test them locally.
4. Commit with clear messages.
5. Open a pull request.

---

## License

This project is for educational and demo purposes. For licensing details, see the repository's license file or contact the maintainers.

---

**Built with care for travelers everywhere.**

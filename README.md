# ✈️ Kibi — AI-Powered Travel Planner

[![Vercel](https://img.shields.io/badge/Live%20on-Vercel-000?logo=vercel&logoColor=white)](https://kibi-rose.vercel.app)
[![HTML5](https://img.shields.io/badge/Built%20with-HTML%20%2B%20Tailwind-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![JS](https://img.shields.io/badge/Logic-Vanilla%20JS-f7df1e?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

> Plan, discover, and save your trips — all in one beautiful, responsive web app.

---

## 🚀 What is Kibi?

**Kibi** is a modern, client-side travel planner that helps you:

- 🌍 Discover trending destinations
- 🗺️ Build personalized AI-style itineraries
- 💼 Manage trips from a personal dashboard
- 🌙 Switch seamlessly between light & dark mode

No build step. No heavy framework. Just fast, clean HTML + Tailwind + vanilla JS.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🏠 **Home** | Hero search, travel stats, and featured destinations |
| 🔍 **Discover** | Filters, search, and trending destination cards |
| 📅 **Plan Trip** | Multi-step wizard for dates, budget, style & companions |
| 🧭 **Itinerary** | Day-by-day schedule with activities & maps |
| 🧳 **My Trips** | All your trips in one place |
| 👤 **Dashboard** | Profile, stats, saved trips, quick actions |
| 🌗 **Dark Mode** | System-aware + manual toggle |
| 🔐 **Auth** | Google OAuth + local accounts |

---

## 🛠️ Tech Stack

```
HTML5        → Markup
Tailwind CSS → Styling (via CDN)
Vanilla JS   → Logic & state
localStorage → Sessions, users, trips
Vercel       → Deployment
```

---

## 📁 Project Structure

```text
Kibi/
├── index.html              🏠 Landing page
├── discover.html           🔍 Browse destinations
├── plan-trip.html          📅 Trip planner
├── itinerary.html          🧭 Generated itinerary
├── my-trips.html         🧳 Trip list
├── dashboard.html        👤 Profile & stats
├── saved-itinerary.html  💾 Saved itineraries
├── login.html / signup.html
├── js/                   Shared modules
│   ├── app.js            Navbar, footer, theme
│   ├── auth.js           Authentication
│   ├── storage.js        Data & localStorage
│   ├── trips.js          Trip rendering
│   └── matching.js       Destination matching
├── assets/               Images & icons
├── server.py             Local dev server
└── README.md           📖 This file
```

---

## 🏃 Run Locally

```bash
git clone https://github.com/Bhargav-bit567/Kibi.git
cd Kibi
python3 server.py
```

Open [http://localhost:8081](http://localhost:8081)

---

## 🔐 Auth Setup

Copy `.env.example` → `.env` and configure:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...
APPLE_REDIRECT_URI=...
```

> ⚠️ Tokens are stored in `localStorage` for demo purposes only. For production, use server-side sessions with HttpOnly cookies.

---

## 🌐 Deploy

1. Push this repo to GitHub
2. Import it on [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy 🎉

---

## 📸 Screenshots

> Add your screenshots to `assets/screenshots/` and update the paths below.

| Home | Discover | Plan Trip | Dashboard |
|------|----------|-----------|-----------|
| ![Home](assets/screenshots/home.png) | ![Discover](assets/screenshots/discover.png) | ![Plan Trip](assets/screenshots/plan-trip.png) | ![Dashboard](assets/screenshots/dashboard.png) |

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Commit your changes
4. Open a Pull Request

---

## 📄 License

Built for learning and demo purposes.

---

**Made with ❤️ for travelers everywhere.**

<div align="center">

# ✈️ KIBI

### Your journey. Smarter planned.

**A travel planner that turns scattered travel research into one organized journey.**

[![Live Demo](https://img.shields.io/badge/🌍_LIVE_DEMO-Kibi-0ea5e9?style=for-the-badge)](https://kibi-mu.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge\&logo=github)](https://github.com/Bhargav-bit567/Kibi)

<img src="frontend/hero.png" alt="Kibi Travel Planner" width="900"/>

**Discover → Plan → Organize → Explore**

</div>

---

## 💡 What is Kibi?

Kibi helps you discover destinations, generate day-by-day itineraries, save trips, and join group trips with travelers who share your style. Everything is stored in MongoDB, so your trips follow your account to any device.

| Feature | What it does |
| --- | --- |
| 🌍 Destination discovery | Browse destinations and group trips |
| 🧭 Itinerary builder | Day-by-day plans using live weather, places, hotels and routes |
| 👥 Group trips | Request to join trips; see your compatibility with other travelers |
| 💾 My Trips | Planned, joined and saved trips stored in your account |
| 🔐 Accounts | Email/password sign-up (hashed passwords, JWT sessions) plus Continue with Google |
| 🛡️ Admin dashboard | Manage users, roles, trips, join requests and an activity log |
| 🌙 Dark mode & responsive UI | Works on desktop, tablet and mobile |

---

## 🛠️ Tech stack

**Frontend:** HTML, Tailwind CSS and vanilla JavaScript.
**Backend:** Node.js, Express, Mongoose, Passport (Google sign-in) and Nodemailer (emails).
**Database:** MongoDB Atlas.
**Hosting:** Vercel.

---

## 📁 Project structure

```text
Kibi/
├── frontend/                  # Everything the browser loads
│   ├── *.html                 # Pages (index, discover, plan-trip, itinerary, my-trips, …)
│   ├── css/                   # Styles
│   ├── js/
│   │   ├── storage.js         # Data layer: loads data from the API and saves changes back
│   │   ├── auth.js            # Login, signup, Continue with Google
│   │   ├── app.js             # Navbar, footer, theme, shared helpers
│   │   ├── trips.js           # Trip pages, itinerary rendering, map
│   │   ├── planner.js         # Itinerary generation
│   │   ├── matching.js        # Traveler/trip compatibility
│   │   ├── api/               # Weather, geocoding, places, routing, Gemini clients
│   │   └── animation/         # Landing-page scroll animation
│   ├── assets/                # Images and the hero animation frames
│
├── backend/                   # Node.js + Express API
│   ├── server.js              # Starts the server (serves the API and ../frontend)
│   ├── app.js                 # Express app and routes setup
│   ├── config.js              # Reads settings from backend/.env
│   ├── db.js                  # MongoDB connection
│   ├── models/                # Mongoose models
│   ├── routes/                # API endpoints
│   ├── middleware/            # JWT authentication
│   ├── passport.js            # Google sign-in strategy (Passport)
│   ├── mailer.js              # Welcome and sign-in emails (Nodemailer)
│   ├── seed/                  # Sample destinations, travelers and group trips
│   ├── vercel.js              # Vercel serverless entry
│   ├── package.json
│   └── .env.example           # Template for backend/.env
│
├── render.yaml                # Render Blueprint (one web service)
├── vercel.json                # Vercel routing (frontend + /api)
└── README.md
```

---

## ⚡ Run it locally

**You need:** [Node.js 20+](https://nodejs.org) and a MongoDB database. Either use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster, or a local MongoDB (`brew install mongodb-community` on macOS).

**1. Install**

```bash
git clone https://github.com/Bhargav-bit567/Kibi.git
cd Kibi/backend
npm install
```

**2. Configure:** create `backend/.env` from the template:

```bash
cp .env.example .env
```

Then set these two values in `backend/.env`:

```env
# Atlas: Connect → Drivers → copy the string, replace <db_password>,
# and put the database name "kibi" after ".mongodb.net/"
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/kibi?retryWrites=true&w=majority
# or a local database:
# MONGODB_URI=mongodb://127.0.0.1:27017/kibi

JWT_SECRET=paste-a-long-random-string-here
```

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**3. Start**

```bash
npm start          # or: npm run dev  (restarts when you edit backend files)
```

Open **http://localhost:3000**. On first start, the sample destinations, travelers and group trips are added to the database automatically.

**4. Become admin:** sign up, then open `http://localhost:3000/admin.html` and click **Claim Admin Access**. Only the first account to do this becomes admin.

### Troubleshooting

| Message | Fix |
| --- | --- |
| `Could not connect to any servers…` or `SSL alert number 80` | Atlas → **Network Access** → add your IP (or `0.0.0.0/0`) and wait until it shows **Active** |
| `bad auth : authentication failed` | Check the user and password in Atlas → **Database Users** (a password change takes about a minute to apply) |
| "Could not reach the Kibi server" toast | The backend isn't running. Run `npm start` inside `backend/` |
| Port 3000 already in use | Set `PORT=3001` in `backend/.env` |

---

## 🔑 Continue with Google

"Continue with Google" uses [Passport](https://www.passportjs.org/) (`passport-google-oauth20`). Clicking the button sends you to Google, Google sends you back to `/api/auth/google/callback`, and the server finds or creates your Kibi account and signs you in. New accounts go to onboarding; returning users go to their dashboard. Accounts are matched by email, so someone who signed up with email and password gets the same account when they use Google.

It works once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Until then, the button says it isn't set up.

### Get the client ID and secret (free, about 5 minutes)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. `Kibi`).
2. Search for **Google Auth Platform** (older layout: **APIs & Services → OAuth consent screen**) → **Get started**.
   * App name `Kibi`, your email as support email, **Audience: External**, your email as contact.
   * Under **Audience → Test users**, add the Gmail accounts that may sign in while the app is in *Testing*. Click **Publish app** later to let anyone sign in.
3. Go to **Clients → Create client** (older layout: **Credentials → Create credentials → OAuth client ID**):
   * **Application type:** Web application
   * **Authorized redirect URIs:** add both
     ```
     http://localhost:3000/api/auth/google/callback
     https://kibi-mu.vercel.app/api/auth/google/callback
     ```
4. Click **Create**, then copy the **Client ID** and **Client secret**.
5. Put them in `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
   ```
6. Restart the server (`npm start`), open http://localhost:3000/login.html and click **Continue with Google**.

For the live site, add the same two variables in **Vercel → Settings → Environment Variables** and redeploy.

| Google error | Fix |
| --- | --- |
| `redirect_uri_mismatch` | The callback URL isn't listed in step 3. It must match exactly, including `http`/`https` and port `3000`. |
| "Access blocked: app has not completed verification" | Add your Gmail under **Test users**, or publish the app |
| "Google sign-in isn't set up yet" | One of the two variables is empty, or the server wasn't restarted |

---

## 🤖 Kibi AI chatbot

The chat bubble in the bottom-right corner of every page is **Kibi AI**, powered by Google Gemini. The same key also powers AI itineraries in Plan Trip.

1. Get a free key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Add it to `backend/.env` and restart the server:
   ```env
   GEMINI_API_KEY=your-gemini-key
   ```

The key stays on the server: the browser sends messages to `POST /api/chat`, and the server adds the key and forwards them to Gemini. Without the key, the chatbot replies that it isn't configured yet.

**Chat memory:**
* **Signed-in users:** every message is saved in MongoDB (`chatmessages`, the latest 500 per user). Each new question is sent to Gemini together with their recent conversation, onboarding preferences, trips and saved itineraries, so answers stay personal across pages, devices and visits. The chat restores itself on every page, and the 🗑️ button in its header clears the history.
* **Guests:** they can chat freely, but nothing is stored; the conversation lasts only while the page is open.

---

## 📧 Emails

Kibi emails users when they **sign up** (a welcome email with a link to set up their travel profile) and when they **sign in** (an alert showing the time in IST, the device, and whether they used a password or Google). The server finishes sending before it responds, so this also works on Vercel. If email is slow or failing, sign-in still goes through: sending gives up after 8 seconds and the error is logged.

There are two ways to send. If `BREVO_API_KEY` is set, Brevo is used; otherwise SMTP is used.

### Option A: Brevo (free, recommended, works on Render's free plan)

[Brevo](https://www.brevo.com/) sends over HTTPS, so it works on hosts that block email ports (Render's free plan does). The free plan allows about 300 emails a day, and you don't need your own domain.

1. Sign up at https://www.brevo.com (free).
2. Go to **Senders, Domains & Dedicated IPs → Senders → Add a sender**, enter the address emails should come from (your Gmail is fine), and click the confirmation link Brevo emails you.
3. Go to **SMTP & API → API Keys → Generate a new API key** and copy it (it starts with `xkeysib-`).
4. Fill in `backend/.env`:
   ```env
   BREVO_API_KEY=xkeysib-...
   MAIL_FROM=Kibi <the.sender.you.verified@gmail.com>
   SITE_URL=http://localhost:3000
   ```
5. Restart the server and sign up with an address you can check (look in Spam the first time).

### Option B: Gmail SMTP (free; not on Render's free plan)

1. Turn on **2-Step Verification** for the Gmail account that will send the emails (Google Account → Security).
2. Open **Google Account → Security → App passwords** (or https://myaccount.google.com/apppasswords), create one named `Kibi`, and copy the 16-character password.
3. Fill these in `backend/.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your.address@gmail.com
   SMTP_PASS=abcdefghijklmnop        # the app password, without spaces
   MAIL_FROM=Kibi <your.address@gmail.com>
   SITE_URL=http://localhost:3000     # use https://kibi-mu.vercel.app on Vercel
   ```
4. Restart the server, sign up with an address you can check, and look for the welcome email (check Spam the first time).

For the live site, add the same variables in your host's environment settings, with `SITE_URL` set to the live address, and redeploy. Gmail allows about 500 emails a day. Any other SMTP provider works by changing the `SMTP_*` values. If neither `BREVO_API_KEY` nor the `SMTP_*` values are set, emails are simply skipped.

---

## 🚀 Deploy on Vercel

1. **Atlas → Network Access:** add `0.0.0.0/0`, because Vercel's IP addresses change.
2. **Vercel → Project → Settings → Environment Variables:** add `MONGODB_URI` and `JWT_SECRET`, with the same values as in `backend/.env`. Add `GEMINI_API_KEY` for Kibi AI, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Continue with Google, and the `SMTP_*`, `MAIL_FROM` and `SITE_URL` values for emails.
3. Leave the project's **Root Directory** as the repository root. `vercel.json` serves `frontend/` as the site and sends `/api/*` to the backend.
4. Push to GitHub (or run `vercel --prod`).

## 🟣 Deploy on Render

Render runs Kibi as one web service: Express serves both the website and the API. The repository includes a `render.yaml` Blueprint with all the settings.

1. Push the code to GitHub.
2. Render → **New → Blueprint**, connect the repository and click **Apply**. Render reads `render.yaml` and asks for the secret values:
   * `MONGODB_URI`: your Atlas connection string, the same as in `backend/.env`
   * `GEMINI_API_KEY`: for the Kibi AI chatbot
   * `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: for Continue with Google

   `JWT_SECRET` is generated automatically and `NODE_ENV` is set to `production`.
3. In Google Cloud → **Credentials** → your OAuth client, add:
   * **Authorized JavaScript origins:** `https://<your-app>.onrender.com`
   * **Authorized redirect URIs:** `https://<your-app>.onrender.com/api/auth/google/callback`
4. Keep `0.0.0.0/0` in Atlas **Network Access** (Render has no fixed IP on the free plan).

Prefer to set it up by hand? Use **New → Web Service** and leave **Root Directory** empty (the server needs both `backend/` and `frontend/`). Then set **Build Command** to `cd backend && npm install`, **Start Command** to `cd backend && npm start`, and add the variables above plus `JWT_SECRET` and `NODE_ENV=production`.

On the free plan, the first visit after about 15 idle minutes takes 30–60 seconds while the service wakes up. For optional emails, use **Brevo** (`BREVO_API_KEY`, `MAIL_FROM`, `SITE_URL`); Gmail SMTP is blocked on the free plan.

**Other hosts (Railway…):** use the same settings as Render. Express serves both the API and the frontend.

---

## 🔌 API

All endpoints are under `/api`. Endpoints that change data need an `Authorization: Bearer <token>` header; you get the token from signup or login.

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/signup`, `POST /auth/login` | Create an account / sign in, returns `{ token, user }` |
| `GET /auth/google` | Continue with Google (redirects to Google, then back to the site signed in) |
| `POST /chat` | Kibi AI chat: `{ message }` → `{ text, saved }`. Saved to the account when signed in |
| `GET /chat/history`, `DELETE /chat/history` | Your saved Kibi AI conversation / clear it |
| `POST /ai/generate` | AI itineraries and overviews: sends `{ prompt }` to Gemini, returns `{ text }` |
| `GET /bootstrap` | All data the current visitor may see (trips, destinations, own profile, notifications…) |
| `PATCH /users/:id`, `PUT /users/:id/preferences`, `DELETE /users/:id` | Profile and preferences; role, status and delete are admin only |
| `PUT /trips/:id`, `PATCH /trips/:id`, `DELETE /trips/:id` | Create, update or delete a trip (creator or admin) |
| `PUT /saved-itineraries/:id`, `DELETE /saved-itineraries/:id` | Your saved itineraries |
| `PUT /join-requests/:id`, `PATCH /join-requests/:id`, `DELETE /join-requests/:id` | Request to join a trip; approve or reject (admin) |
| `PUT /notifications/:id`, `POST /notifications/:id/read`, `POST /notifications/read-all` | Notifications |
| `DELETE /admin/activity-log` | Clear the activity log (admin) |
| `GET /health` | Health check |

---

## 🔒 Keeping secrets out of GitHub

`backend/.env` (database password, JWT secret, Google and Gemini keys) is in `.gitignore` and are never pushed. Only the `*.example` templates are committed. On Vercel, secrets go in **Environment Variables**, not in files.

---

## 📸 Screens

<div align="center">
<img src="frontend/map.png" width="850" alt="Kibi map"/>
<br><br>
<img src="frontend/plan.png" width="850" alt="Kibi trip planner"/>
</div>

---

## 🤝 Contributing

Issues and pull requests are welcome. Open an issue describing the bug or idea, then send a PR.

<div align="center">

Made with ☕, code, and a little bit of wanderlust. ⭐ Star the repo if you like it!

</div>

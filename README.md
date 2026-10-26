# ✈️ Kibi – Travel Planner

**Your journey. Smarter planned.**

Kibi is a full-stack travel planning web app built as a college project. Users can discover destinations across India, generate day-by-day itineraries, save trips, join group trips, and chat with an AI travel assistant.

### 🌍 Live Website: [kibi-kyiq.onrender.com](https://kibi-kyiq.onrender.com/)

> Hosted on Render's free plan – the first visit may take 30–60 seconds to wake the server up.

![Kibi home page](frontend/hero.png)

---

## Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Screenshots](#screenshots)
4. [Project Structure](#project-structure)
5. [How to Run Locally](#how-to-run-locally)
6. [API Endpoints](#api-endpoints)
7. [Deployment](#deployment)
8. [License](#license)

---

## Features

- **Accounts** – sign up / log in with email or Google
- **Discover** – explore destinations across India
- **Trip Planner** – day-by-day itineraries with weather, places and hotels
- **My Trips** – save and manage your trips
- **Group Trips** – join trips with other travelers
- **Kibi AI** – travel chatbot (Google Gemini) that remembers chats for logged-in users
- **Admin Dashboard** – manage users and trips
- **Dark Mode** and mobile-friendly design

---

## Tech Stack

| Part | Technology |
| --- | --- |
| Frontend | HTML, Tailwind CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Authentication | JWT, bcrypt, Passport (Google login) |
| AI | Google Gemini API |
| Hosting | Render |

---

## Screenshots

**Trip Planner**

![Trip planner](frontend/plan.png)

**Map View**

![Map view](frontend/map.png)

---

## Project Structure

```
Kibi/
├── frontend/          # Website: HTML pages, CSS, JavaScript, images
├── backend/
│   ├── server.js      # Starts the server
│   ├── app.js         # Express app and routes
│   ├── models/        # MongoDB schemas (User, Trip, ChatMessage…)
│   ├── routes/        # API endpoints
│   └── middleware/    # JWT login check
├── thunder-client/    # API collection for testing in Thunder Client
└── render.yaml        # Render deployment config
```

---

## How to Run Locally

**Requirements:** Node.js 22 and a MongoDB Atlas database.

1. **Clone and install**
   ```bash
   git clone https://github.com/Bhargav-bit567/Kibi.git
   cd Kibi/backend
   npm install
   ```

2. **Create `backend/.env`** (copy `.env.example`) and fill in:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=any-long-random-text
   GEMINI_API_KEY=your-gemini-api-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. Open **http://localhost:3000**

---

## API Endpoints

Base URL: **https://kibi-kyiq.onrender.com/api**

🔒 = needs the header `Authorization: Bearer <token>` (the token comes from signup/login).

**Auth**

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/signup` | Create an account → returns `token` |
| POST | `/auth/login` | Log in → returns `token` |

**Users**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/users` | All users |
| GET | `/users/:id` | One user |
| GET | `/users/:id/trips` | Trips created by that user |
| GET | `/users/me` 🔒 | The logged-in user |
| PATCH | `/users/:id` 🔒 | Update your profile |
| DELETE | `/users/:id` 🔒 | Delete a user (admin only) |

**Trips**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/trips` | All trips |
| GET | `/trips/:id` | One trip |
| POST | `/trips` 🔒 | Create a trip |
| PATCH | `/trips/:id` 🔒 | Update a trip (only its creator) |
| DELETE | `/trips/:id` 🔒 | Delete a trip (only its creator) |

**Kibi AI**

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/chat` | Ask Kibi AI (saved to your account when logged in) |
| GET | `/chat/history` 🔒 | Your saved chat |

To test the API, import the files in `thunder-client/` into the Thunder Client extension in VS Code.

---

## Deployment

The app is deployed on **Render** as one web service – the Express server serves both the website and the API.

- Live URL: **https://kibi-kyiq.onrender.com**
- Settings are in `render.yaml`
- Secrets (`MONGODB_URI`, `GEMINI_API_KEY`, Google keys) are added as Environment Variables on Render, never committed to GitHub
- Every push to the `main` branch redeploys automatically

---

## License

MIT

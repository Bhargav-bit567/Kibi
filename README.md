# Kibi – Travel Planner

Kibi is a travel planning web app built as a college project. Users can discover destinations, generate day-by-day itineraries, save trips, join group trips, and chat with an AI travel assistant.

![Kibi home page](frontend/hero.png)

## Features

- Sign up / log in with email or Google
- Discover destinations across India
- Generate day-by-day itineraries with weather, places and hotels
- Save trips and view them in My Trips
- Join group trips with other travelers
- Kibi AI chatbot (Google Gemini) that remembers chats for logged-in users
- Admin dashboard to manage users and trips
- Dark mode and mobile-friendly design

## Tech Stack

- **Frontend:** HTML, Tailwind CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose)
- **Other:** Passport (Google login), JWT, Gemini API

## Project Structure

```
Kibi/
├── frontend/   # HTML pages, CSS, JavaScript, images
├── backend/    # Express server, API routes, MongoDB models
└── render.yaml # Deployment config for Render
```

## How to Run

1. Clone the repository and install the backend packages:
   ```bash
   git clone https://github.com/Bhargav-bit567/Kibi.git
   cd Kibi/backend
   npm install
   ```

2. Create a `.env` file inside `backend/` (copy `.env.example`) and fill in:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=any-long-random-text
   GEMINI_API_KEY=your-gemini-api-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000 in your browser.

## API

Base URL: `/api`. Routes marked 🔒 need the header `Authorization: Bearer <token>` (the token comes from signup/login).

| Method | Route | What it does |
| --- | --- | --- |
| POST | `/auth/signup` | Create an account → returns `token` |
| POST | `/auth/login` | Log in → returns `token` |
| GET | `/users` | All users |
| GET | `/users/:id` | One user |
| GET | `/users/:id/trips` | Trips created by that user |
| GET | `/users/me` 🔒 | The logged-in user |
| PATCH | `/users/:id` 🔒 | Update your profile |
| DELETE | `/users/:id` 🔒 | Delete a user (admin only) |
| GET | `/trips` | All trips |
| GET | `/trips/:id` | One trip |
| POST | `/trips` 🔒 | Create a trip |
| PATCH | `/trips/:id` 🔒 | Update a trip (only its creator) |
| DELETE | `/trips/:id` 🔒 | Delete a trip (only its creator) |
| POST | `/chat` | Ask Kibi AI (saved to your account when logged in) |

## Deployment

The project is deployed on **Render** as a single web service (the Express server serves both the website and the API). The settings are in `render.yaml`. Add the same values from `.env` as environment variables on Render.

## Screenshots

![Trip planner](frontend/plan.png)
![Map view](frontend/map.png)

## License

MIT

# ⚡ URL Shortener Service

A premium, highly scalable, and secure full-stack URL shortener service (like Bitly or TinyURL) featuring rapid redirection caching, detailed geo-analytics, password gates, and a sleek cyber-neon glassmorphic web dashboard.

---

## 🚀 Key Features

*   **Sub-10ms Redirections:** In-memory URL resolving using **Redis** with automated fallback to **PostgreSQL** in case of cache misses or connection failures.
*   **Detailed Click Telemetry:** Background analytics logging captures click times, browser types, operating systems, client devices (desktop/mobile/tablet), referrers (Twitter/X, LinkedIn, Google, etc.), and approximate geographical coordinates (country/city).
*   **Security Lock (Password Wall):** Optional bcrypt-hashed password protection. Serve a custom glowing glassmorphic gate checking credentials before redirecting.
*   **Alias Management:** Instant auto-generated base62 short codes or user-defined custom aliases.
*   **Bulk Shortener Engine:** Drag-and-drop CSV parser handles parallel requests asynchronously, providing a real-time progress console.
*   **Dynamic QR Generator:** Instant dynamic mobile sharing links with built-in PNG image download triggers.
*   **Link Previews:** Scrapes title, description, and favicon from the target webpage during shortening to render premium dashboard visual cards.

---

## 🛠️ Tech Stack

*   **Backend:** Node.js, Express, ES Modules, Prisma ORM, JWT, BcryptJS, GeoIP-lite, UA-Parser-JS
*   **Database & Cache:** PostgreSQL 15, Redis 7
*   **Frontend:** React, Vite, Chart.js (React ChartJS 2), Lucide React, Premium custom HSL Vanilla CSS
*   **Orchestration:** Docker, Docker-Compose, Nginx (Reverse Proxy)

---

## 📦 Local Setup Instructions

### Option 1: Orchestrated Boot (Recommended)
Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine, then run:

```bash
docker-compose up --build
```

This launches the full stack:
*   **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
*   **Backend API Service:** [http://localhost:5000](http://localhost:5000)
*   **Postgres Relational DB:** port 5432
*   **Redis Caching Client:** port 6379

---

### Option 2: Manual Host Boot (For Development)

#### 1. Databases
Launch local Postgres and Redis clients. Update the `.env` variables at the root of the project to match your connection credentials:

```ini
DATABASE_URL="postgresql://postgres:password@localhost:5432/url_shortener?schema=public"
REDIS_URL="redis://localhost:6379"
```

#### 2. Start Backend API
```bash
cd backend
npm install
npx prisma db push # Pushes schema and generates Prisma Client models
npm run dev
```

#### 3. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis server address | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key used to encrypt Auth tokens | `glassmorphic-cyber...` |
| `PORT` | Backend port | `5000` |
| `BASE_URL` | Domain prepended to shortened codes | `http://localhost:5000` |
| `FRONTEND_URL` | Origin permitted by CORS policies | `http://localhost:3000` |

---

## 📡 REST API Documentation

### 1. User System

#### **POST** `/api/auth/signup` (Register)
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com", "password":"password123"}'
```

#### **POST** `/api/auth/login` (Login)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com", "password":"password123"}'
```

---

### 2. Link Management

#### **POST** `/api/links/shorten` (Shorten URL)
*Supports optional custom back halves, scheduled expiration, and password gate protection.*
```bash
curl -X POST http://localhost:5000/api/links/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://example.com/deep/path",
    "customAlias": "mypage",
    "expiresAt": "2026-12-31T23:59:59Z",
    "password": "linkSecretPassword"
  }'
```

#### **GET** `/api/links` (List Links)
*Requires JWT Bearer header. Supports query params `search` and `filter` (`active`, `disabled`, `expired`).*
```bash
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" http://localhost:5000/api/links
```

#### **PUT** `/api/links/:id` (Update Link)
```bash
curl -X PUT http://localhost:5000/api/links/<link_id> \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://new-destination.com",
    "isEnabled": false
  }'
```

#### **DELETE** `/api/links/:id` (Delete Link)
```bash
curl -X DELETE http://localhost:5000/api/links/<link_id> \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 3. Redirection & Analytics

#### **GET** `/:code` (Redirect)
```bash
curl -I http://localhost:5000/mypage
```

#### **GET** `/api/links/:id/stats` (Fetch Click Analytics)
```bash
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" http://localhost:5000/api/links/<link_id>/stats
```

---

## 📐 Key Design Decisions

### Why HTTP 302 instead of 301?
We use **HTTP 302 (Temporary Redirect)**. HTTP 301 is aggressively cached by web browsers. If a client queries your short URL once under a 301 code, subsequent clicks on that machine bypass your server and route directly to the destination from local browser cache. This blocks any chance of logging repeat click analytics, user agents, or referrers. HTTP 302 forces client browsers to check our routing engine on every hit, maintaining absolute traffic accuracy.

### Redis Fail-Safe Resiliency
If Redis crashes or goes offline, our connection client blocks the exception, marks `isConnected = false`, and falls back to resolving destinations directly via PostgreSQL database indexing. REDIS acts as an acceleration layer, but does not represent a single-point-of-failure.

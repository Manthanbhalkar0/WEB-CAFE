# Read & Roast — Full Website Pack

A complete website for **Read & Roast (RAR)**, a reading-room cafe in Kopargaon:
a React frontend and a Spring Boot backend, wired together with a live menu API
and an order-placement API (no payment gateway — orders are marked "pay at counter").

```
rar-cafe/
├── frontend/     React + Vite site (what visitors see)
└── backend/      Spring Boot REST API (menu + orders, H2 database)
```

## Quick start

You need **Node.js 18+** for the frontend and **Java 17+ with Maven** for the backend.
Run both — the frontend automatically talks to the backend if it's up, and falls
back to a built-in copy of the menu (with local order confirmation) if it's not,
so you can also preview the frontend completely on its own.

### 1. Start the backend (port 8080)

```bash
cd backend
mvn spring-boot:run
```

This starts an in-memory H2 database, auto-seeds it with the full cafe menu, and
exposes:

| Method | Endpoint                     | Description                         |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/menu`                   | List all menu items                  |
| POST   | `/api/menu`                   | Add a menu item                      |
| PUT    | `/api/menu/{id}`              | Update a menu item                   |
| DELETE | `/api/menu/{id}`              | Remove a menu item                   |
| POST   | `/api/orders`                 | Place an order (returns order number)|
| GET    | `/api/orders`                 | List all orders                      |
| GET    | `/api/orders/{orderNumber}`   | Look up one order                    |
| PUT    | `/api/orders/{id}/status?status=READY` | Update order status (PLACED, PREPARING, READY, COMPLETED, CANCELLED) |

Browse the database directly at `http://localhost:8080/h2-console`
(JDBC URL: `jdbc:h2:mem:rarcafe`, user `sa`, no password).

### 2. Start the frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. It will fetch the live menu from the backend and
send real orders to it. If you want to point it at a different backend URL,
copy `.env.example` to `.env` and edit `VITE_API_BASE`.

### 3. Build for production

```bash
cd frontend
npm run build       # outputs static site to frontend/dist

cd ../backend
mvn clean package   # outputs runnable jar to backend/target/rar-cafe-backend.jar
java -jar target/rar-cafe-backend.jar
```

Deploy `frontend/dist` to any static host (Netlify, Vercel, Nginx, GitHub Pages)
and the backend jar to any Java host (Render, Railway, a VPS, etc.) — just make
sure `VITE_API_BASE` in the frontend build points at wherever the backend ends
up living.

## What's inside

- **Frontend** — single-page site: hero, cafe story, live category-tabbed menu,
  gallery, reviews, Kopargaon location with an embedded map, and a slide-in cart
  drawer for placing orders. Light-brown/cream palette, animated coffee steam
  and drifting beans, scroll-reveal animations, fully responsive.
- **Backend** — Spring Boot 3 REST API with a `MenuItem` and `Order` model,
  H2 in-memory database (zero setup — swap for MySQL/Postgres later by editing
  `application.properties`), CORS enabled for the frontend, and order numbers
  generated per order (e.g. `RAR-4821`).
- **No payment gateway** — orders are placed and confirmed with an order number;
  the UI notes payment is collected at the counter, as requested.

## Customizing

- Menu items: edit the seed list in
  `backend/src/main/java/com/rarcafe/config/DataSeeder.java` (or use the API).
- Cafe copy, colors, gallery captions, reviews: `frontend/src/App.jsx` and
  `frontend/src/index.css`.
- Address/map: the `#visit` section in `App.jsx` (swap the OpenStreetMap iframe
  coordinates for your exact location if it needs adjusting).

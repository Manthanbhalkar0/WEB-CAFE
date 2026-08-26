# ☕ Cafe Point — Cafe Management & Online Ordering System

A complete, ready-to-run cafe website: customers browse the menu, register,
order online, book tables and leave feedback — while the admin manages
products, orders, bookings, customers, bills and sales reports from one
dashboard.

- **Frontend:** HTML, CSS, JavaScript (no framework — runs anywhere)
- **Backend:** Node.js + Express (REST API)
- **Database:** MySQL
- **Auth:** JWT + bcrypt password hashing
- **Payments:** UPI (to a phone number) / Card (simulated) / Cash — see
  the **Payments** section below for what this does and doesn't do.

---

## 1. What you get

```
cafe-point/
├── backend/                 <- Node.js + Express API (separate from frontend)
│   ├── config/db.js         <- MySQL connection pool
│   ├── middleware/auth.js   <- JWT + admin-role guards
│   ├── routes/              <- auth, menu, orders, bookings, feedback, admin
│   ├── schema.sql            <- full MySQL schema + starter menu data
│   ├── utils/seed.js        <- one-command DB setup + default admin account
│   ├── server.js            <- app entry point
│   ├── package.json
│   └── .env.example         <- copy to .env and fill in your values
├── frontend/                <- plain HTML/CSS/JS (separate from backend)
│   ├── index.html, menu.html, cart.html, checkout.html, booking.html,
│   │   login.html, register.html, my-orders.html, order-confirmation.html,
│   │   admin.html
│   ├── css/style.css
│   └── js/ (api.js, cart.js, main.js, menu.js, checkout.js, admin.js, home.js)
├── .gitignore
└── README.md                <- this file
```

### Customer features
- Browse menu by category, search, veg-only filter
- Register with name, email, **phone number** and address (so the cafe can
  contact you) / Login
- Cart with live totals, per-item special notes ("less sugar", "no onion"...)
- Checkout with delivery/pickup details + special order comments
- 3 payment options: **UPI**, **Card**, **Cash on pickup**
- Order confirmation with a live status tracker (Received → Preparing →
  Ready → Completed)
- Table booking with date, time and guest count
- Order & booking history ("My Orders")
- Feedback / review form shown on the homepage

### Admin features (`/admin.html`)
- Dashboard with today's orders, revenue, pending orders/bookings, totals
- **Orders:** view all orders + items, update order status, mark payment
  as Paid/Pending/Failed, **download a PDF bill** per order
- **Menu management:** add new products, edit any field, quick-edit price
  inline, mark items unavailable, delete products
- **Bookings:** view and confirm/cancel table reservations
- **Customers:** contact list (name, email, phone, address) to reach out
  to customers about their orders
- **Reports:** weekly/monthly sales totals, daily revenue chart, top-selling
  items, payment-method breakdown
- **Feedback:** read all customer feedback

### Security & reliability (built in)
- Passwords hashed with bcrypt — never stored in plain text
- JWT-based auth; admin API routes reject non-admin tokens
- Server re-checks every price from the database at checkout (never trusts
  the browser)
- Placing an order writes the order **and** its items in a single MySQL
  transaction — either both are saved, or neither is
- Basic rate limiting on the API to reduce spam/brute-force attempts
- All form pages `reset()` themselves after a successful submit, so if you
  come back to a login/register/checkout/booking/feedback page, the fields
  are empty and ready to fill again — nothing is left behind in the form

---

## 2. Prerequisites

Install these once on your computer:

1. **Node.js** (v18 or newer) — https://nodejs.org
2. **MySQL Server** (v8 recommended) — https://dev.mysql.com/downloads/mysql/
3. **Git** — https://git-scm.com
4. A free **GitHub** account — https://github.com

Check they're installed:
```bash
node -v
npm -v
mysql --version
git --version
```

---

## 3. Run it locally — step by step

### Step 1 — Get the project on your computer
If you downloaded this as a zip, extract it. Then open a terminal inside
the `cafe-point` folder.

### Step 2 — Install backend dependencies
```bash
cd backend
npm install
```

### Step 3 — Configure your environment
```bash
cp .env.example .env
```
Open `backend/.env` in any text editor and fill in:
- `DB_PASSWORD` — your MySQL root password
- `JWT_SECRET` — replace with any long random string (this signs login
  tokens — keep it secret)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the login you'll use to access
  `/admin.html`
- `UPI_ID` / `UPI_NUMBER` — already set to **8459662016** as you requested;
  change it any time

### Step 4 — Create the database
Make sure MySQL is running, then from inside `backend/`:
```bash
npm run seed
```
This creates the `cafe_point` database, all tables, a starter menu (16
items across 5 categories), and your admin account. You'll see a message
confirming the admin login was created.

### Step 5 — Start the server
```bash
npm start
```
You should see:
```
🍵 Cafe Point server running at http://localhost:3000
```
Open **http://localhost:3000** in your browser — that's the whole
website (frontend + backend running together on one port). Log in to
**http://localhost:3000/admin.html** with the admin email/password from
your `.env`.

> During development you can instead run `npm run dev` (uses nodemon) so
> the server restarts automatically whenever you edit a backend file.

---

## 4. Payments — please read this

You asked for a payment gateway that accepts payment on your phone number
**8459662016**. Here's exactly what's built, and an important limitation:

- **What's built:** at checkout, customers see your UPI number/ID
  (`8459662016@upi`) and a scannable QR code, and can choose UPI, Card
  (simulated), or Cash. The order is saved immediately with
  `payment_status = PENDING`. From the admin **Orders** tab, you mark it
  **Paid** once you've actually received the money in your UPI app — this
  is a manual confirmation flow, which is completely normal for small
  cafes and needs no bank/merchant paperwork.
- **What a "real" payment gateway would add:** automatic, instant payment
  verification (so the order flips to Paid by itself) requires signing up
  with a payment provider such as **Razorpay, PayU, Cashfree or Stripe**,
  completing their KYC/merchant verification, and getting API keys — this
  is something only you (the business owner) can do, since it needs your
  bank details and identity documents. I can't create that account for
  you, but the code is ready for it: `backend/.env` already has
  `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` placeholders, and once you
  have real keys, adding the Razorpay Checkout script + a
  "create order → verify signature" pair of API calls to
  `routes/orders.js` is a well-documented, ~30-minute integration
  (see https://razorpay.com/docs/payments/payment-gateway/web-integration/).

---

## 5. Push this project to GitHub

From the **root** `cafe-point` folder (not inside backend/frontend):

```bash
git init
git add .
git commit -m "Initial commit: Cafe Point full-stack app"
```

Then on GitHub.com:
1. Click **+ → New repository**, name it (e.g. `cafe-point`), leave it
   empty (no README/license), click **Create repository**.
2. Copy the commands GitHub shows you under "…or push an existing
   repository", which look like:
```bash
git remote add origin https://github.com/YOUR-USERNAME/cafe-point.git
git branch -M main
git push -u origin main
```

That's it — your whole project (frontend + backend, in clearly separate
folders) is now on GitHub. The `.gitignore` already excludes
`node_modules/` and your real `.env` file, so your database password and
JWT secret are never uploaded.

> If you'd rather keep frontend and backend in **two separate GitHub
> repositories** instead of one, just run the same `git init / add /
> commit / remote / push` steps separately inside the `frontend/` and
> `backend/` folders.

---

## 6. Deploying it live (optional)

To make the site reachable on the internet (not just localhost):

1. **Backend + database:** deploy to a Node-friendly host such as
   [Render](https://render.com), [Railway](https://railway.app), or a VPS.
   Add a managed MySQL database (Render/Railway offer this, or use
   PlanetScale/Clever Cloud's free MySQL tier) and paste its credentials
   into your host's environment variables (same names as `.env`).
2. Run `npm run seed` once against the live database (most hosts let you
   run a one-off command), then `npm start`.
3. The Express server already serves the `frontend/` folder itself, so
   one deployment gives you the whole site on one URL — no separate
   frontend hosting needed. (If you prefer separating them, you can
   deploy `frontend/` to Netlify/Vercel/GitHub Pages instead, and point
   `API_BASE` in `frontend/js/api.js` to your backend's live URL.)

---

## 7. Main API endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/health` | Public |
| GET | `/api/menu` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/bookings` | Public / customer |
| POST | `/api/orders` | Public / customer |
| GET | `/api/orders/mine` | Customer |
| GET | `/api/orders` | Admin |
| PUT | `/api/orders/:id/status` | Admin |
| PUT | `/api/orders/:id/payment` | Admin |
| GET | `/api/orders/:id/bill` | Admin (PDF) |
| POST/PUT/DELETE | `/api/menu/:id` | Admin |
| GET | `/api/bookings` | Admin |
| GET | `/api/admin/dashboard` | Admin |
| GET | `/api/admin/customers` | Admin |
| GET | `/api/admin/reports?range=weekly\|monthly` | Admin |
| POST | `/api/feedback` | Public |

---

## 8. Troubleshooting

- **"Could not connect to MySQL"** on startup → check `DB_PASSWORD` in
  `.env`, and that MySQL is actually running (`mysql.server start` on
  Mac, or check the MySQL service on Windows/Linux).
- **Admin login doesn't work** → re-run `npm run seed`; it prints the
  exact admin email/password it created (only creates it once).
- **Port 3000 already in use** → change `PORT` in `.env`.
- **Changes to frontend not showing** → hard-refresh the browser
  (Ctrl/Cmd + Shift + R) — static files are sometimes cached.

Enjoy your cafe! ☕

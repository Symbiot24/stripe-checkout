# Utkarsh Task

A full-stack e-commerce demo project with Stripe payment integration.

## Project Structure

```
backend/
  package.json
  server.js
  config/
    db.js
  controllers/
    paymentController.js
  models/
    order.js
  routes/
    paymentRoutes.js
  webhooks/
    stripeWebhook.js
frontend/
  index.html
  package.json
  tailwind.config.js
  vite.config.js
  src/
    App.jsx
    index.css
    main.jsx
    components/
      Cart.jsx
      ProductCard.jsx
    config/
      api.js
    pages/
      Cancel.jsx
      Home.jsx
      Orders.jsx
      Success.jsx
```

## Features
- Product listing and cart management (React + Tailwind CSS)
- Stripe payment integration (backend and frontend)
- Order management and status pages
- Webhook handling for payment events

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- Stripe account (for API keys)

### Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (e.g., Stripe keys, DB URI) in a `.env` file.
4. Start the backend server:
   ```bash
   node server.js
   ```

### Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend dev server:
   ```bash
   npm run dev
   ```

## Environment Variables
- **Backend**: Create a `.env` file in `backend/` with:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `MONGODB_URI` (if using MongoDB)
- **Frontend**: Update API endpoints in `src/config/api.js` if needed.

## Deployment
- Deploy backend and frontend separately (e.g., Render, Vercel, Netlify).
- Ensure environment variables are set in your deployment environment.

## License
MIT

---
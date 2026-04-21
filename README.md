# AutoMart - Vehicle Spare Parts E-Commerce Platform

AutoMart is a college-level full-stack project for vehicle spare-parts shopping with:

- Vehicle-based shopping (select vehicle -> see compatible parts)
- General spare-parts shopping (without selecting vehicle)
- Admin panel for catalog, vehicles, compatibility, users, orders, and coupons
- AI assistant for spare-parts guidance
- INR pricing, GST/shipping summary, checkout, orders, and invoice

## Active Architecture

- Frontend: `frontend/` (Next.js 14)
- Backend: `backend_python/` (Flask + SQLAlchemy)

Legacy folders (`backend/`, `website/`) are not part of the active stack.

## Key Features

- User auth: register, login, logout, forgot/reset password, change password
- Profile: addresses, My Garage (saved vehicles), order history
- Vehicle search by company/model/year/variant/fuel type
- Product catalog with filters and vehicle compatibility mapping
- Cart + coupon + checkout
- Payment modes:
  - COD
  - Demo payment simulation
  - Razorpay sandbox (optional)
- Admin dashboard with CRUD for:
  - products, vehicles, categories, brands
  - compatibility mappings
  - users and orders
  - coupons
- AI chatbot with cost/rate controls

## Local Setup

### 1) Backend (Flask)

```powershell
cd backend_python
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Backend URLs:

- API: `http://127.0.0.1:5000/api`
- Health: `http://127.0.0.1:5000/api/health`

### 2) Frontend (Next.js)

```powershell
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Frontend URL: `http://localhost:3000`

## Environment Files

- Backend template: `backend_python/.env.example`
- Frontend template: `frontend/.env.local.example`
- Deployment matrix: [DEPLOYMENT_ENV_MATRIX.md](DEPLOYMENT_ENV_MATRIX.md)

## Payment Options

AutoMart supports 2 project-level payment modes:

1. Demo mode (no real gateway):
- Leave Razorpay keys empty in backend env
- Checkout shows demo payment result selector

2. Razorpay sandbox mode:
- Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in backend env
- UPI/Card opens Razorpay test checkout modal
- Backend verifies payment signature before confirming order

## API Tests

```powershell
cd backend_python
python run_api_tests.py
```

## Demo Credentials (seeded)

- Admin: `admin@automart.local` / `admin123`
- User: `demo@automart.local` / `demo123`

## Deployment (Free-Tier Friendly)

Recommended:

- Frontend: Vercel (Hobby)
- Backend: Render (Free Web Service)
- Images: Cloudinary Free

Refer [DEPLOYMENT_ENV_MATRIX.md](DEPLOYMENT_ENV_MATRIX.md) for exact env variable mapping.

## Project Documents

- [AUTOMART_GAP_ANALYSIS.md](AUTOMART_GAP_ANALYSIS.md)
- [FINAL_QA_CHECKLIST.md](FINAL_QA_CHECKLIST.md)
- [SPARE_PARTS_GUIDE.md](SPARE_PARTS_GUIDE.md)
- [REPO_STRUCTURE.md](REPO_STRUCTURE.md)

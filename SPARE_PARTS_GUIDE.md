# AutoMart Setup, API Key, Deploy, and Testing Guide

This guide is for the active AutoMart stack:
- `frontend/` (Next.js)
- `backend_python/` (Flask API)

## 1. Local Setup

### Backend
```powershell
cd backend_python
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```
Health check: `http://127.0.0.1:5000/api/health`

### Frontend
```powershell
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

## 2. OpenAI API Key (Step-by-Step)

Main rule: **Put OpenAI key only in backend env, never frontend env.**

1. Open `https://platform.openai.com/`
2. Sign in or create account
3. Go to API Keys: `https://platform.openai.com/api-keys`
4. Click **Create new secret key**
5. Copy the key once (you cannot view it again later)
6. Open file: `backend_python/.env`
7. Add:
```env
OPENAI_API_KEY=sk-xxxxxxxx
AI_DISABLED=0
```
8. Restart backend:
```powershell
cd backend_python
python run.py
```

### Cost-safe settings (recommended for free/limited credits)
In `backend_python/.env`, add:
```env
AI_CHAT_MODEL=gpt-4o-mini
AI_CHAT_MAX_TOKENS=120
AI_CHAT_TEMPERATURE=0.2
AI_CHAT_RATE_LIMIT_PER_10_MIN=25
AI_CHAT_CACHE_SECONDS=900
AI_CHAT_QUOTA_COOLDOWN_SECONDS=1800
AI_CHAT_RATE_LIMIT_COOLDOWN_SECONDS=90
AI_EMBED_FOR_SMART_SEARCH=0
AUTO_REINDEX_ON_STARTUP=0
```

What this does:
- short replies (1-2 lines)
- reduced token usage
- rate limit to avoid spam burn
- response caching to avoid repeated calls

## 3. Image Uploads (Admin)

AutoMart now supports image upload from Admin for:
- spare parts
- vehicles

Upload mode:
- **Cloudinary** when credentials are configured (recommended for hosting)
- **local folder fallback** when Cloudinary is not configured (good for local dev)

Add in `backend_python/.env`:
```env
PUBLIC_BACKEND_URL=http://127.0.0.1:5000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=automart
IMAGE_MAX_MB=6
RAW_IMAGE_MAX_MB=20
```

Notes:
- Images are auto-cropped to 4:3 and optimized before save/upload.
- Local fallback path is `backend_python/instance/uploads/admin/...`.
- Backend serves uploads at `/uploads/...`.
- `RAW_IMAGE_MAX_MB` controls incoming upload request size (fixes 413 for large camera photos).
## 4. Frontend Environment

File: `frontend/.env.local`
```env
BACKEND_URL=http://127.0.0.1:5000
NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_YOUR_KEY_ID
```

Note:
- Frontend calls `/api/*`
- Next.js rewrite forwards to `BACKEND_URL`

## 5. Free Hosting Plan (Vercel + Render)

## Frontend on Vercel
1. Push repo to GitHub
2. Import project on Vercel (root: `frontend`)
3. Add env var:
```env
BACKEND_URL=https://<your-render-backend-url>
```
4. Deploy

## Backend on Render
1. New Web Service (root: `backend_python`)
2. Build:
```bash
pip install -r requirements.txt
```
3. Start:
```bash
gunicorn run:app
```
4. Add env vars:
```env
FLASK_SECRET_KEY=<long-random-string>
OPENAI_API_KEY=sk-...
AI_DISABLED=0
ORIGIN=https://<your-vercel-domain>
PUBLIC_BACKEND_URL=https://<your-render-backend-url>
HOST=0.0.0.0
PORT=10000
SESSION_COOKIE_SECURE=1
REMEMBER_COOKIE_SECURE=1
SESSION_COOKIE_SAMESITE=Lax
REMEMBER_COOKIE_SAMESITE=Lax
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

## 6. API Test Scripts

All API tests are under `backend_python/tests`.

Run all tests:
```powershell
cd backend_python
python run_api_tests.py
```

Direct pytest:
```powershell
cd backend_python
python -m pytest
```

Covered areas:
- auth/profile/password/address/garage
- product/vehicle/cart/coupon/checkout/orders/invoice
- admin CRUD (categories, brands, products, vehicles, compatibility, coupons, users, orders)
- AI endpoints (`/api/ai/chat`, `/api/ai/smart-search`, `/api/ai/recommendations`)

## 7. Chatbot Functional Goal (Current)

Chatbot now:
- accepts user vehicle/company query
- returns concise response
- suggests spare parts
- allows direct **Add** to cart
- links each suggestion to product detail page

This matches your project goal:
- recommend by vehicle/company context
- provide quick 1-2 line guidance
- convert suggestions into cart actions

## 8. Useful Demo Accounts

- Admin: `admin@automart.local` / `admin123`
- User: `demo@automart.local` / `demo123`

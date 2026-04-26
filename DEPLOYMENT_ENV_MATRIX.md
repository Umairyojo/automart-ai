# AutoMart Deployment Env Matrix

Use this file when deploying frontend (Vercel) and backend (Render).

## Frontend (Vercel) - `frontend`

Required:

- `BACKEND_URL=https://<your-backend-domain>`

Optional:

- `NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_xxx` (fallback only; backend config is primary)

## Backend (Render) - `backend_python`

Required:

- `FLASK_SECRET_KEY=<long-random-secret>`
- `DATABASE_URL=<persistent-database-url>`
- `ORIGIN=https://<your-frontend-domain>`
- `PUBLIC_BACKEND_URL=https://<your-backend-domain>`
- `HOST=0.0.0.0`
- `PORT=10000`
- `SESSION_COOKIE_SECURE=1`
- `REMEMBER_COOKIE_SECURE=1`
- `SESSION_COOKIE_SAMESITE=Lax`
- `REMEMBER_COOKIE_SAMESITE=Lax`

AI (optional but recommended if chatbot needed):

- `OPENAI_API_KEY=sk-...`
- `AI_DISABLED=0`
- `AI_CHAT_MODEL=gpt-4o-mini`
- `AI_CHAT_MAX_TOKENS=120`
- `AI_CHAT_RATE_LIMIT_PER_10_MIN=25`
- `AI_CHAT_CACHE_SECONDS=900`
- `AI_CHAT_QUOTA_COOLDOWN_SECONDS=1800`
- `AI_CHAT_RATE_LIMIT_COOLDOWN_SECONDS=90`
- `AI_EMBED_FOR_SMART_SEARCH=0`
- `AUTO_REINDEX_ON_STARTUP=0`

Images:

- `CLOUDINARY_CLOUD_NAME=<cloud-name>`
- `CLOUDINARY_API_KEY=<api-key>`
- `CLOUDINARY_API_SECRET=<api-secret>`
- `CLOUDINARY_UPLOAD_FOLDER=automart`
- `REQUIRE_CLOUDINARY_UPLOADS=1`
- `IMAGE_MAX_MB=6`
- `RAW_IMAGE_MAX_MB=20`

Important:

- Do not use the default SQLite database for the deployed backend. Free hosting filesystems can be recreated, so admin-created products, orders, and users can disappear and the app will seed the demo catalog again.
- Do not rely on local `/uploads` storage in deployment. Use Cloudinary; otherwise uploaded images can disappear after a service restart or redeploy.

Payments (optional for real sandbox checkout):

- `RAZORPAY_KEY_ID=rzp_test_xxx`
- `RAZORPAY_KEY_SECRET=xxxx`
- `RAZORPAY_CURRENCY=INR`

## Post-deploy checks

1. `GET https://<backend>/api/health` returns `ok: true`
2. Health response has `database_url_configured: true`
3. Health response has `cloudinary_configured: true`
4. Login/register works from frontend
5. Admin image upload works
6. Cart + checkout + orders work
7. Chatbot fallback works even if OpenAI quota exhausted

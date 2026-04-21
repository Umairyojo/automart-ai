# AutoMart Final QA Checklist

Use this checklist before demo/viva and before deployment handoff.

## 1. Local Run

- [ ] Backend starts with no crash:
  - `cd backend_python`
  - `python run.py`
- [ ] Frontend starts with no crash:
  - `cd frontend`
  - `npm run dev`
- [ ] Health endpoint works:
  - `GET http://127.0.0.1:5000/api/health` returns `ok: true`

## 2. Auth Flow

- [ ] Register new user from `/login` (register tab)
- [ ] Login works and redirects to `/profile`
- [ ] Logout works
- [ ] Forgot password works on `/forgot-password`
- [ ] Reset password works on `/reset-password`
- [ ] Login with updated password works

## 3. User Profile

- [ ] Profile details update works
- [ ] Add/edit/delete address works
- [ ] Default address selection works
- [ ] Add vehicle to garage works
- [ ] Set default garage vehicle works
- [ ] Remove garage vehicle works

## 4. Vehicle-Based Shopping

- [ ] `/vehicle-search` lists vehicles
- [ ] Selecting a vehicle opens `/vehicle/[id]`
- [ ] Compatible parts are shown
- [ ] Add from vehicle page to cart works

## 5. General Spare Parts Shopping

- [ ] `/spare-parts` loads products
- [ ] Search filter works
- [ ] Category filter works
- [ ] Brand filter works
- [ ] Product type filter works
- [ ] Product detail page `/products/[slug]` opens correctly

## 6. Cart / Checkout / Orders

- [ ] Add/update/remove cart items works
- [ ] Coupon apply works
- [ ] Checkout with COD works
- [ ] Checkout with demo UPI/Card status works
- [ ] Order appears in `/orders`
- [ ] Order detail page works
- [ ] Invoice endpoint/page works
- [ ] Cancel order (allowed states) works

## 7. Admin Panel

- [ ] Admin login works
- [ ] `/admin` dashboard cards load
- [ ] Create/update/delete category works
- [ ] Create/update/delete brand works
- [ ] Create/update/delete vehicle works
- [ ] Create/update/delete product works
- [ ] Product stock update + out-of-stock works
- [ ] Product/vehicle image upload works
- [ ] Compatibility mapping add/delete works
- [ ] Coupon create/update/delete works
- [ ] User block/unblock works
- [ ] Order status update works

## 8. AI Chatbot

- [ ] Chat visible on user pages
- [ ] Chat hidden on admin pages
- [ ] Chat gives short spare-part suggestions
- [ ] Chat add-to-cart works
- [ ] Chat “View” opens valid product page
- [ ] Quota exhausted fallback message works gracefully

## 9. UI/Responsive

- [ ] Navbar consistent across key pages
- [ ] Cart page uses same theme
- [ ] Mobile layout checked (home, spare-parts, cart, profile, admin)
- [ ] No dead buttons on critical pages

## 10. Images and Media

- [ ] Product image displays in spare parts cards
- [ ] Vehicle image displays in cars/bikes/vehicle search
- [ ] Uploaded images load without broken links
- [ ] Cloudinary mode tested (if configured)

## 11. API and Code Quality

- [ ] Backend tests pass: `python run_api_tests.py`
- [ ] Frontend type-check passes: `npx tsc --noEmit`
- [ ] No severe runtime errors in console

## 12. Deployment Ready

- [ ] Frontend `BACKEND_URL` points to deployed backend
- [ ] Backend `ORIGIN` points to deployed frontend
- [ ] Backend `PUBLIC_BACKEND_URL` set
- [ ] `SESSION_COOKIE_SECURE=1` and `REMEMBER_COOKIE_SECURE=1` in production
- [ ] Cloudinary env vars set in production (recommended)
- [ ] OpenAI key present only in backend env

## 13. Viva Quick Script

- [ ] Show vehicle-based shopping flow
- [ ] Show general spare-parts flow
- [ ] Show admin CRUD + image upload
- [ ] Show mock payment checkout + order history + invoice
- [ ] Show chatbot recommendation + add-to-cart

# AutoMart Gap Analysis (Phase 1 Audit)

Date: 2026-04-17

## Active Stack Decision

- Primary stack for AutoMart: `backend_python` (Flask + SQLAlchemy + session auth) + `website` (HTML/CSS/JS).
- Legacy/non-primary stack: `frontend` (Next.js) + `backend` (Node) is mostly mock/incomplete for current spare-parts goals.

## Feature Status Matrix

| Module | Status | Notes |
|---|---|---|
| User registration/login/logout | Completed | Session-based auth works, password hashing enabled. |
| Forgot password / reset password | Completed | Added secure reset token flow with demo reset-link support. |
| Change password | Completed | Added authenticated change-password endpoint. |
| Profile view/edit | Completed | Added `/api/auth/profile` GET/PUT and `profile.html` integration. |
| Saved addresses | Completed | Added address CRUD API and account UI integration. |
| Order history (user) | Completed | Added `/api/orders` and `/api/orders/<id>` plus account page rendering. |
| Vehicle search by brand/model/year/variant/fuel | Missing Completely | No vehicle master tables or vehicle search endpoints yet. |
| Vehicle selection + compatibility shopping mode | Missing Integration | Compatibility text exists on products, but no selected-vehicle workflow yet. |
| General/universal loose parts shopping | Partially Completed | Catalog browsing exists, but no explicit product type classification yet. |
| Branded/company parts browsing | Missing Backend | No dedicated `company/brand` model/filter pipeline yet. |
| Category/subcategory browsing | Partially Completed | Category exists as flat string; subcategory structure missing. |
| Product filters (brand, price, rating, stock, compatibility) | Partially Completed | Category + text search present; advanced filters missing. |
| Product detail page | Partially Completed | Name, description, price, stock, compatibility shown; reviews/spec schema missing. |
| Wishlist | Missing Completely | Not implemented in active stack. |
| Cart add/update/remove | Completed | Session cart is working end-to-end. |
| Coupon in cart | Missing Completely | No coupon model/rules/application logic yet. |
| Checkout | Partially Completed | Works with login and shipping text; payment method selection missing. |
| Payment flow (UPI/Card/COD, status handling) | Missing Backend | No payment entity or status transitions yet. |
| Order placement | Completed | Checkout creates orders and decrements stock. |
| Order tracking/cancel | Missing Backend | Status updates for customer flow not exposed. |
| Invoice generation | Missing Completely | No invoice endpoint/template yet. |
| GST/tax + shipping calculation | Missing Backend | Total currently equals product subtotal only. |
| Admin login/protection | Partially Completed | Admin is role-based via normal auth; no dedicated admin login page flow. |
| Admin dashboard summary | Partially Completed | Basic analytics available. |
| Admin product CRUD | Completed | Create/update/delete/list exists and integrated in `admin.html`. |
| Admin vehicle management | Missing Completely | No vehicle tables, CRUD, or product mapping UI yet. |
| Admin category/brand management | Missing Backend | Not implemented in active stack. |
| Admin order management | Missing Integration | Analytics includes recent orders; status-update CRUD missing. |
| Admin user management | Missing Completely | Not implemented. |
| Admin coupon management | Missing Completely | Not implemented. |
| Contact/support page | Missing Completely | Chat widget exists, dedicated page missing. |
| Return/refund policy page | Missing Completely | Not implemented. |
| Responsive UI | Partially Completed | Base responsive styling exists; final cross-device QA pending. |

## What Was Implemented in This Pass

1. Auth/account backend expansion:
   - `backend_python/app/api_auth.py`
   - Added profile update, change password, forgot/reset password, address CRUD.
2. New models:
   - `Address`
   - `PasswordResetToken`
   - File: `backend_python/app/models.py`
3. User order history API:
   - `GET /api/orders`
   - `GET /api/orders/<id>`
   - File: `backend_python/app/api_shop.py`
4. Frontend integration:
   - Added `website/profile.html`
   - Added `website/forgot-password.html`
   - Added `website/reset-password.html`
   - Updated `website/checkout.html` to use saved addresses.
   - Updated `website/js/api.js` with new account/order API helpers.
   - Updated `website/login.html` forgot-password link.
5. Branding alignment:
   - UI titles/logo switched to `AutoMart`.
   - Seed/demo account naming updated to `@automart.local`.

## Implementation Roadmap (Next Modules)

1. Vehicle Core (highest priority):
   - Vehicle brand/model/variant/year/fuel entities.
   - Vehicle selection API + session persistence.
   - Compatibility mapping table and vehicle-filtered product listing.
2. Product Classification:
   - `product_type` (`vehicleSpecific`, `universal`, `companyBranded`)
   - Brand/company entity + admin CRUD + storefront filters.
3. Checkout + Payment:
   - Payment method selection (UPI/Card/COD mock).
   - Payment record + status (`success/failed/pending`).
   - Tax/shipping calculations and order summary improvements.
4. Admin Business Ops:
   - Order status management panel.
   - User list/basic block-unblock.
   - Category/subcategory/brand managers.
5. Commerce Enhancements:
   - Coupon model and application logic.
   - Invoice generation endpoint + downloadable invoice view.
6. Final QA & Polish:
   - Cross-device responsive validation.
   - Flow testing matrix (user/admin end-to-end).
   - Dead-link/button cleanup and docs update.

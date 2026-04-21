# AutoMart Repository Structure (LLM Handoff)

This tree includes all major project folders and a one-line purpose for each.

```text
car-bike-ecommerce/
+- backend/                           # Legacy Node/Express backend (older stack, mostly not primary now)
|  +- database/                       # SQL schema and local SQLite DB artifacts for the Node stack
|  +- node_modules/                   # Installed npm dependencies for the Node backend
|  +- src/                            # Node backend source code
|     +- config/                      # DB/service initialization and runtime config helpers
|     +- middleware/                  # Auth/error middleware for Express routes
|     +- routes/                      # REST API endpoints (auth, products, cart, orders, admin, chat)
|     +- socket/                      # Socket auth and real-time communication helpers
|     +- utils/                       # Utility functions (including chat helpers)
|
+- backend_python/                    # Primary Flask backend used by current AutoMart web UI
|  +- .venv/                          # Local Python virtual environment (developer machine specific)
|  +- app/                            # Flask application package (models, APIs, AI, seed logic)
|  +- instance/                       # Runtime data folder (SQLite DB and uploaded files)
|  +- __pycache__/                    # Python bytecode cache for backend_python module files
|
+- frontend/                          # Legacy Next.js frontend (older/parallel stack, partly mock)
|  +- .next/                          # Next.js build/runtime cache
|  +- node_modules/                   # Installed npm dependencies for Next.js app
|  +- app/                            # App Router pages and route groups
|  |  +- (auth)/                      # Auth route group in Next.js app
|  |  |  +- login/                    # Login page route
|  |  +- (shop)/                      # Shop route group in Next.js app
|  |  |  +- about/                    # About page route
|  |  |  +- cart/                     # Cart page route
|  |  +- [category]/                  # Dynamic category route
|  |  +- admin/                       # Admin pages in Next.js stack
|  |  +- bikes/                       # Bikes listing page route
|  |  +- cars/                        # Cars listing page route
|  |  +- chatbot/                     # Chatbot page route
|  |  +- products/                    # Product route segment container
|  |  |  +- [slug]/                   # Product detail dynamic route
|  |  +- profile/                     # User profile page route
|  |  +- search/                      # Search page route
|  +- components/                     # Reusable React components for Next.js UI
|     +- chatbot/                     # Chatbot-specific React component(s)
|
+- website/                           # Primary static frontend served by Flask (HTML/CSS/JS)
   +- css/                            # Global styles for the static AutoMart website
   +- js/                             # Client-side logic (API calls, widgets, voice/chat integration)
```

## Root-Level Notes

- `README.md`: General project overview (contains mixed legacy/current stack info).
- `SPARE_PARTS_GUIDE.md`: Practical run/setup guide for the active Flask + static website flow.
- `AUTOMART_GAP_ANALYSIS.md`: Current feature audit, status matrix, and implementation roadmap.

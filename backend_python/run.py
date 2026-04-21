"""
Run the spare-parts server locally:
  python run.py

Default: http://127.0.0.1:5000
Serves the `website/` folder and `/api/*` JSON endpoints.
"""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = bool(app.config.get("FLASK_DEBUG", False))
    app.run(
        host=host,
        port=port,
        debug=debug,
        use_reloader=debug,
        threaded=True,
    )

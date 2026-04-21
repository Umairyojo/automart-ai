$env:FLASK_DEBUG = "0"
$env:AUTO_REINDEX_ON_STARTUP = "0"
if (Test-Path ".\.venv\Scripts\python.exe") {
  .\.venv\Scripts\python.exe run.py
} else {
  python run.py
}

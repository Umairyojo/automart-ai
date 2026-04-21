"""
Run AutoMart backend API tests.
Usage:
  python run_api_tests.py
"""
import subprocess
import sys


def main() -> int:
    cmd = [sys.executable, "-m", "pytest"]
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())

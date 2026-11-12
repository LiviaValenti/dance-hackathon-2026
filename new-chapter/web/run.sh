cd "$(dirname "$0")/.."
source venv/bin/activate
pip install -q -r web/requirements-web.txt
exec uvicorn web.app:app --host 0.0.0.0 --port 3081 --timeout-keep-alive 120

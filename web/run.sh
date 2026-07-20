cd "$(dirname "$0")"
source ../venv/bin/activate
pip install -q -r requirements-web.txt
exec uvicorn app:app --host 0.0.0.0 --port 3081

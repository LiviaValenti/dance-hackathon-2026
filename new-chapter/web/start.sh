#!/bin/bash
cd /root/projects/dance-scoring/web
export PYTHONPATH=/root/projects/dance-scoring
source ../venv/bin/activate
exec uvicorn app:app --host 0.0.0.0 --port 3081 --timeout-keep-alive 120

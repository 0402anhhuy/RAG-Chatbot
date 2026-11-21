.PHONY: dev test lint typecheck format lock

dev:
	python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

test:
	python -m pytest

lint:
	python -m ruff check app config tests

typecheck:
	python -m mypy app config

format:
	python -m ruff format app config tests

lock:
	pip-compile --resolver=backtracking --generate-hashes --strip-extras --output-file=requirements.lock requirements.txt

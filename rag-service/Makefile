.PHONY: dev test lint typecheck format lock eval eval-matrix

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
	@echo "requirements.txt is the supported manifest; CI installs it without a hash lock."

eval:
	python -m app.eval.cli --dataset eval/vi_golden.jsonl --out eval-out

eval-matrix:
	python -m app.eval.cli --dataset eval/vi_golden.jsonl --out eval-out --matrix --no-workflow

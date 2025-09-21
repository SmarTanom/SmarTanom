PYTHON=python
DJANGO=cd backend && $(PYTHON) manage.py

.PHONY: install install-dev migrate run format lint test shell createsuperuser

install:
	pip install -r backend/requirements.txt

install-dev: install
	pip install -r backend/requirements-dev.txt

migrate:
	$(DJANGO) migrate

run:
	$(DJANGO) runserver 0.0.0.0:8000

format:
	ruff check --fix backend || true
	black backend
	isort backend

lint:
	ruff check backend
	mypy backend || true
	django-admin check --settings=smartanom.settings
	django-admin check --deploy --settings=smartanom.settings || true

dev-shell:
	$(DJANGO) shell

test:
	pytest -q backend

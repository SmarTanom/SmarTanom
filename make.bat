@echo off
REM Simple Windows wrapper for common dev tasks.
IF "%1"=="install" GOTO install
IF "%1"=="install-dev" GOTO installdev
IF "%1"=="migrate" GOTO migrate
IF "%1"=="run" GOTO run
IF "%1"=="format" GOTO format
IF "%1"=="lint" GOTO lint
IF "%1"=="test" GOTO test
IF "%1"=="dev-shell" GOTO devshell
ECHO Unknown target %1
EXIT /B 1

:install
pip install -r backend\requirements.txt
GOTO end

:installdev
pip install -r backend\requirements.txt && pip install -r backend\requirements-dev.txt
GOTO end

:migrate
cd backend && python manage.py migrate
GOTO end

:run
cd backend && python manage.py runserver 0.0.0.0:8000
GOTO end

:format
ruff check --fix backend
black backend
isort backend
GOTO end

:lint
ruff check backend
mypy backend
python backend\manage.py check --deploy || echo Deploy checks reported warnings
GOTO end

:test
pytest -q backend
GOTO end

:devshell
cd backend && python manage.py shell
GOTO end

:end
EXIT /B 0

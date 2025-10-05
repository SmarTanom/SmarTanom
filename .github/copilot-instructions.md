## SmarTanom AI Coding Agent Instructions

Concise project-specific guidance to help an AI agent work effectively in this repository. Focus on current reality (no speculative features).

### 1. Big Picture Architecture
- Monorepo layout: `backend/` (Django REST API), `frontend/` (React Vite scaffold), `mobile/` (React Native / Expo scaffold). Only `backend/` has substantive logic today.
- Domain model (monitoring): `User -> Device -> (Reservoir, Sensor) -> SensorData`. See `backend/apps/monitoring/models.py` for constraints, indexes, and business validations (`Reservoir.clean`).
- Authentication: Passwordless email OTP with custom user model (`apps.accounts.User`). OTP issuance / verification + rate limiting: `OTPCode`, `LoginAttempt` models in `apps.accounts.models` with configurable settings in `smartanom/settings.py` (env-driven: `OTP_*`). Uses DRF Token + Session + Basic auth classes; most API endpoints require authentication except health / auth endpoints.
- API style: DRF `ModelViewSet` + router, per-resource filtering (`django-filter`), search and ordering. Querysets restricted to the requesting user unless `is_staff` (see `get_queryset` overrides in `apps.monitoring.views`).
- Environment / config: Single settings module (`smartanom/settings.py`) presently; environment variables override defaults (SECRET_KEY, DB_*, OTP_*, throttle rates). Supports DATABASE_URL or discrete DB_* variables, defaulting to SQLite when unset.
- Observability: Basic file + console logging configured; logs written to `backend/logs/django.log` (directory ensured at startup). Health endpoint: `apps.monitoring.views.healthz` returns DB status.

### 2. Key Developer Workflows
- Local backend (pure Python):
  1. `cd backend`
  2. `py -m venv .venv && .\.venv\Scripts\Activate.ps1`
  3. `pip install -r requirements.txt`
  4. `python manage.py migrate && python manage.py runserver`
- OTP auth quick test (dev console email backend): POST JSON to `/api/auth/request-otp/` then `/api/auth/verify-otp/` (see `README_AUTH.md` for curl examples). Response includes `debug_code` in debug mode.
- Seed mock monitoring data: `python manage.py seed_mock_data --readings-per-sensor 24 --days 3` (idempotent; never creates superusers).
- Run tests (current minimal coverage): `python manage.py test apps.monitoring` (pytest markers appear in `test_health.py` but project uses Django test runner; pytest may be installed via requirements—avoid mixing unless adding config).
- Docker (dev full stack): `docker-compose up --build` uses Postgres + Redis + backend + frontend; backend dev image migrates automatically (`docker/Dockerfile.backend.dev`). Production composition handled by `docker-compose.prod.yml` + multi-stage Dockerfile(s).

### 3. Patterns & Conventions
- Back-end apps under `backend/apps/`. New domain logic should follow monitoring app structure: `models.py`, `serializers.py`, `views.py`, `urls.py` with `ModelViewSet` and permission scoping like `DeviceViewSet.get_queryset`.
- Access scoping rule: Non-staff users only see objects linked (directly or via FK chain) to `request.user`; staff sees all. Reuse pattern in new viewsets.
- Model constraints: Prefer database-level `UniqueConstraint` + explicit composite indexes (see `Sensor` & `SensorData`). When adding new models, replicate the explicit `indexes` array for fields queried in filters/orders.
- Pagination: DRF PageNumber (50) globally; do not override unless necessary. Filtering should use `filterset_fields` (exact) + `search_fields` (case-insensitive partial) + `ordering_fields`.
- OTP lifecycle: Creating a new OTP invalidates previous unused ones (`OTPCode.create_otp`). Verification increments attempts first; `is_valid` checks (unused, not expired, attempts < max). Any auth feature extension must preserve rate limit invariants (`LoginAttempt.is_rate_limited`).
- Security toggles: When `DEBUG` false, settings auto-enable HSTS, secure cookies, SSL redirect, content type / XSS protections. Do not reimplement—reuse the conditional block pattern.
- Logging: Use module-level loggers (e.g., `logger = logging.getLogger("apps.accounts")`) to benefit from targeted levels defined in `LOGGING` (`apps.accounts` has debug in dev). Avoid printing directly.
- Environment flags: Treat `true`/`false` case-insensitively when adding new boolean env vars (follow existing `.lower() == "true"`).

### 4. External Integrations & Future Hooks
- Redis present but not yet used for Celery or caching—avoid assuming Celery tasks exist; if adding, reference `REDIS_URL` env already populated in compose.
- Email: Default backend is console; production path expects SMTP variables (see README_AUTH). Any new mail feature should gracefully degrade under console backend.
- No current WebSocket / async layer despite `VITE_WS_URL` placeholder in frontend compose; adding channels would require ASGI config extension (`ASGI_APPLICATION` already defined).

### 5. File Landmarks
- `backend/smartanom/settings.py` – single source of config (custom user model, OTP, logging, DB parsing, security toggles).
- `backend/apps/accounts/models.py` – core auth models & rate limiting logic.
- `backend/apps/monitoring/models.py` – canonical style for model definitions (constraints + indexes + validation).
- `backend/apps/monitoring/views.py` – exemplar DRF viewset patterns (scoped queryset, filtering/search/order backends, health endpoint).
- `backend/templates/emails/otp_email.*` – HTML + text OTP templates; extend similarly for future notification types.
- `docker/Dockerfile.backend.dev` vs `docker/Dockerfile.backend` – dev (volume mount, auto migrate) vs multi-stage production build.
- `docker-compose.yml` – development stack; highlight env mapping & healthchecks.

### 6. Common Pitfalls & Gotchas
- Tests: `pytest` marker used but no `pytest.ini`; running `pytest` alone may not pick up Django settings—prefer `python manage.py test` unless a full pytest integration is added.
- OTP timing / attempts: Verification increments attempt counter before validity test; client-side retries consume quota even if code expired—design UIs accordingly.
- Custom user table name overridden (`db_table = 'auth_user'`) to mirror Django default—migrations altering built-in auth must be reviewed carefully to avoid clashes.
- SQLite vs Postgres: Some constraints / indexes behave differently; always test composite uniqueness and case-insensitive queries after switching DB engine.
- Health endpoint path in tests is `/healthz` while API health route (router area) is `/api/health/` (documented in root README). Align or document before adding monitoring tooling to avoid confusion.

### 7. Adding New API Resources (Template)
1. Create `apps/<newapp>/` with `models.py`, `serializers.py`, `views.py`, `urls.py`.
2. Add app to `INSTALLED_APPS` in `settings.py`.
3. Follow monitoring viewset conventions: scoped queryset, filter/search/order config, pagination inherits global.
4. Register routes in `smartanom/urls.py` via a router include (mirroring existing patterns).
5. Add composite indexes / unique constraints early to avoid migration churn.

### 8. Example: Scoped Queryset Pattern
```python
class ExampleViewSet(ModelViewSet):
    queryset = Example.objects.select_related('device').all()
    serializer_class = ExampleSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        return qs if self.request.user.is_staff else qs.filter(device__user=self.request.user)
```

### 9. Deployment Notes
- Production compose uses single `app` container (likely backend only as of now) exposing port 80 mapped to Django 8000; ensure static files collected if/when static assets added (`COLLECT_STATIC` flag present in dev env vars but not yet implemented—add management command hook before enabling).
- Ensure `ALLOWED_HOSTS`, `SECRET_KEY`, and DB credentials passed via env; Redis optional until background processing added.

### 10. When Extending
- Reuse existing env var parsing & security toggle patterns.
- Maintain staff vs owner data isolation.
- Add logging with structured context for auth / OTP changes.
- Write migrations with explicit indexes mirroring performance patterns already present.

---
Provide feedback if clarification is needed on: health endpoint naming, pytest integration status, or impending Celery/Redis usage.
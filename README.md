# How to apply this

Everything mirrors your real repo's folder structure.

## A. Bug fixes (drop in, replacing the existing file)
- `manage.py`, `humrine_site/wsgi.py`, `humrine_site/asgi.py` — fix the wrong
  default settings module (root cause of `AppRegistryNotReady`)
- `humrine_site/settings/static.py` — fixes the `ENVIRONMENT` import
- `humrine_site/settings/base.py` — restores `INSTALLED_APPS`, adds `'engagement'`
- `humrine_site/settings/__init__.py` — removes the `ROOT_URLCONF` override that
  was silently disabling ALL real routing, site-wide, all the time
- `humrine_site/urls.py` — removes a dead import, uncomments `toons`, adds
  `engagement` AND `home` (`path('', include('home.urls'))` — this is what
  fixes the `/` 404)

⚠️ **Diff `base.py` against your current file** before overwriting — I
restored `INSTALLED_APPS` from your `base.py.bak`, kept `allauth.*` commented
out (separate issue, see below), and added `'engagement'`.

⚠️ **`/health/` now resolves to a different view than before.** `home.urls`
also defines a `health/` route (plain-text `"OK"`), and it now sits ahead of
your original `path('health/', HealthCheckView.as_view(), ...)` (JSON
`{"status": "ok"}`) — so the JSON one is currently unreachable dead code.
Harmless unless something external expects that exact JSON shape. Fix by
either deleting `home/urls.py`'s `health/` line, or reordering `urls.py`.

## B. New / extended app code (the feature)
- `toons/__init__.py`, `apps.py`, `admin.py`, `views.py`, `urls.py`, `tests.py`
  — restored from `toons_temp/` (NOT migrations — see below)
- `blog/views.py` — adds the engagement mixin to `PostDetailView`
- `templates/blog/post_detail.html`, `templates/toons/story_detail.html` —
  one new `{% include %}` line each
- `engagement/` — the full new app, **including `tests.py`** (11 test cases —
  see "Tests" below)

After copying these in:
```
python manage.py migrate
python manage.py test engagement
```

## Tests
`engagement/tests.py` has 11 cases, all passing against a clean DB in my
sandbox: anonymous users blocked from commenting/reacting, comment creation
and rendering, hidden comments excluded, empty comments rejected, reaction
create/toggle-off/switch-type behavior, invalid reaction type rejected, two
users reacting independently. `toons/tests.py` is still just Django's default
empty boilerplate — I didn't add toon-specific tests since I didn't change
toons' own behavior, only restored its missing files.

**Caveat:** these pass in an isolated sandbox (fresh sqlite, dummy env vars).
I have not run them against your actual local environment, real database, or
Docker setup — please run `python manage.py test engagement` yourself after
applying these files and tell me if anything differs.

## ⚠️ NOT included / NOT fixed: `toons/migrations/`
Two stacked problems, confirmed by reproduction (`/toons/` → `OperationalError:
no such table: toons_toonstory`):
1. `toons/migrations/` is missing `__init__.py` — Django doesn't even
   recognize it as a migrations package (`showmigrations toons` → `(no
   migrations)`), so `migrate` silently skips it with no error.
2. Once `__init__.py` exists, the real gap shows up: only `0003_...py` exists,
   and it depends on a `0002_alter_toonstory_description` that doesn't exist —
   `0001` and `0002` are both missing.

Check your actual local repo first — they may exist there and just didn't
make it into this mirror. If they're genuinely gone and this is dev-only with
disposable data:
```bash
touch toons/migrations/__init__.py
rm toons/migrations/0003_alter_toonpanel_order_alter_toonstory_description_and_more.py
python manage.py makemigrations toons
python manage.py migrate
```

## ⚠️ NOT fixed: allauth / login
`AUTHENTICATION_BACKENDS` references `allauth.account.auth_backends.AuthenticationBackend`,
but `allauth.*` is commented out of `INSTALLED_APPS`. As configured, this
breaks **all** login, site-wide (confirmed during testing). Either remove
that line from `AUTHENTICATION_BACKENDS` until allauth is properly installed,
or actually install it (apps back in `INSTALLED_APPS`, run its migrations,
uncomment `path('accounts/', include('allauth.urls'))`, add
`allauth.account.middleware.AccountMiddleware` to `MIDDLEWARE`).

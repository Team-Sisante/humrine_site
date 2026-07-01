# Hotfix: 4 issues

## Issue 1 — Twitter button missing from login.html + Third-Party Login Failure

**Root cause (two problems):**
1. `login.html`'s `{% else %}` fallback block (used when no `SocialApp`
   credentials are registered in the Django admin yet) only had Google and
   Facebook hardcoded — Twitter was omitted. `signup.html` had all three.
   A missing button was the visible symptom; adding it back is the fix.

2. `social_auth.py`'s Twitter provider config had `SCOPE: ['tweet.read',
   'users.read']` — those are Twitter API v2 / OAuth2 scopes — but no
   `'METHOD': 'oauth2'` or `'OAUTH_PKCE_ENABLED': True`. The provider
   defaults to OAuth1, allauth sends an OAuth1 flow, Twitter's OAuth2-
   registered app rejects it → "Third-Party Login Failure". Fixed by
   adding the correct method settings that match the v2 scopes.
   **Note:** this assumes the app in the Twitter Developer Console is
   actually registered as an OAuth2 app with `tweet.read`/`users.read`
   permissions. If it's an OAuth1 app, the scopes need to change instead:
   remove `SCOPE`, keep `METHOD: 'oauth1'` (or just remove the config
   block entirely and let allauth use its defaults).

**Files changed:** `templates/account/login.html`, `humrine_site/settings/social_auth.py`

## Issue 2 — Two static folders

`static/` is the **source** folder you put your own files in (favicon, custom
CSS, etc.) and is declared in `STATICFILES_DIRS`. `staticfiles_local/` is
the **output** folder that `collectstatic` populates in development — it's
Django's `STATIC_ROOT` when `ENVIRONMENT` is not staging/production, and
is generated/regenerated automatically, never needs to be committed. Both
are correct and should exist. No code change needed — this is just a
misunderstanding of how Django's static files pipeline works.

**Files changed:** none.

## Issue 3 — docker-compose.vm.yml mounts ./staticfiles (host path that doesn't exist)

**Root cause (my error):** I wrote the compose file using `./staticfiles`
bind-mounts for both `web-*` and `nginx-*` services. In staging/production,
`STATIC_ROOT = '/app/staticfiles'` is inside the container (populated at
build time or by `collectstatic` at startup) — not a directory on the host.
Binding `./staticfiles` from the repo root mounted a non-existent host
directory, which silently shadows the container's existing `/app/staticfiles`
with an empty directory.

**Fix:** replaced the bind-mounts with named Docker volumes
(`staticfiles_staging`, `staticfiles_production`) declared at the top of
the compose file. Both `web-*` (writes to it) and `nginx-*` (reads from
it) now reference the same named volume per environment, so `collectstatic`
output is actually shared. No host directory needed.

**Files changed:** `docker-compose.vm.yml`

## Issue 4 — Dockerfile.compile pre-import step fails with GCP_PROJECT_ID missing

**Root cause:** `base.py` calls `require_env('GCP_PROJECT_ID')` unconditionally
at module import time. The second `RUN` block (PyInstaller build) already
had `GCP_PROJECT_ID=dummy-for-build`, but the *first* `RUN` block (the
pre-import sanity check for `blog.templatetags`) was missing it, along
with `SITE_HEADER`, `SITE_TITLE`, `SITE_INDEX_TITLE`, `APP_PROTOCOL`,
`APP_DOMAIN`, `APP_PORT`. Django imports the entire settings module just
to do `django.setup()`, so every `require_env()` call fires.

**Also found:** `profiles/` and `core/` (both added in Phase 1) were not
in the `COPY` list — they wouldn't exist inside the container, causing an
`ImportError` on the very first request touching any profile or adapter
logic. Added them to both `COPY` and `--collect-all`.

**Files changed:** `Dockerfile.compile`

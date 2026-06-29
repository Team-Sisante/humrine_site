# How to apply this

Everything mirrors your real repo's folder structure.

## A. Bug fixes (drop in, replacing the existing file)
- `manage.py`, `humrine_site/wsgi.py`, `humrine_site/asgi.py` — wrong default settings module (root cause of `AppRegistryNotReady`)
- `humrine_site/settings/static.py` — fixes the `ENVIRONMENT` import
- `humrine_site/settings/base.py` — restores `INSTALLED_APPS` (now including `allauth.*` — see below), adds `'engagement'`, uncomments `allauth.account.middleware.AccountMiddleware`
- `humrine_site/settings/__init__.py` — removes the `ROOT_URLCONF` override that was silently disabling all real routing
- `humrine_site/urls.py` — dead import removed, `toons`/`engagement`/`home`/`accounts` (allauth) all wired in

⚠️ **Diff `base.py` and `urls.py` against your current files** before overwriting.

## A.1 — NEW this round: allauth is now actually enabled
This is what was causing `RuntimeError: Model class allauth.account.models.EmailAddress
doesn't declare an explicit app_label...` on `/admin/login/`. `AUTHENTICATION_BACKENDS`
referenced allauth's backend while `allauth.*` sat commented out of `INSTALLED_APPS` —
neither off nor on. Confirmed fixed: `/admin/login/` now returns `200` in my sandbox.

**Install these 4 packages first** (see `requirements-additions.txt` — these aren't
hard dependencies of `django-allauth` itself, they're needed by the specific
providers you have configured):
```
PyJWT==2.13.0
cryptography==49.0.0
oauthlib==3.3.1
requests-oauthlib==2.0.0
```
Discovered one at a time by actually running `migrate` and fixing each
`ModuleNotFoundError` as it appeared — `jwt` (Google), then `cryptography`
(Google's JWT verification), then `oauthlib`/`requests-oauthlib` (Twitter's
OAuth1 flow).

Then:
```
pip install -r requirements.txt   # after adding the 4 lines above
python manage.py migrate          # applies allauth's own account.* and socialaccount.* tables
```

## ⚠️ Still no social signup buttons after this — here's why, and what's left
Enabling the apps isn't sufficient. I tested `/accounts/signup/` and it now
crashes with `allauth.socialaccount.models.SocialApp.DoesNotExist` — there's
no actual Google/Facebook/Twitter OAuth app registered anywhere yet. This is
the one piece I genuinely can't do for you, since it needs real credentials
from each provider's developer console. Two ways to register them once you
have the Client ID/Secret for each:

**Option 1 — Django admin (simplest, no code change):**
1. `python manage.py createsuperuser`
2. Log into `/admin/`, go to **Social Applications** → **Add**
3. For each provider: pick the provider, paste Client ID + Secret, add your Site

**Option 2 — settings-driven (better for Docker/env-var workflow this project already uses):**
Add an `'APP'` key to each provider in `social_auth.py`'s `SOCIALACCOUNT_PROVIDERS`:
```python
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'APP': {
            'client_id': get_env_variable('GOOGLE_CLIENT_ID'),
            'secret': get_env_variable('GOOGLE_CLIENT_SECRET'),
            'key': '',
        },
    },
    # ... same 'APP' pattern for 'facebook' and 'twitter'
}
```
I'm inferring `GOOGLE_CLIENT_ID`/`FACEBOOK_CLIENT_ID`/`TWITTER_CLIENT_ID` as the
likely paired env var names (your env files already had `*_CLIENT_SECRET` for
all three) — verify the actual names in your real `.env` files before using this.

## B. New / extended app code (the comment/reaction feature) — unchanged this round
See previous README content: `toons/` restoration, `blog/views.py`, the two
templates, and the full `engagement/` app including `tests.py` (11 passing tests).

## ⚠️ Still NOT fixed: `toons/migrations/` gap
Unchanged from before — missing `__init__.py` plus missing `0001`/`0002`. See
prior notes; confirmed via `/toons/` → `OperationalError: no such table`.

## ⚠️ Still outstanding (cosmetic): `/health/` route shadowing
`home.urls`'s plain-text `health/` still sits ahead of your JSON
`HealthCheckView` in `urls.py`. Unchanged from before.

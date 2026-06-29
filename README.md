# What's in this delivery, and where it goes

This covers what was outstanding after your last commit — checked file-by-file
against what's actually in `xmione/humrine-site-debug` right now, not assumed.

## In `humrine-site-debug`

- **`humrine_site/image_utils.py`** (new) — shared resize helper.
- **`blog/models.py`** — `Post` and `PostImage` now auto-downscale to
  `IMAGE_MAX_WIDTH = 1200` on save. Preserves aspect ratio and format
  (JPEG stays JPEG with quality=85; PNG transparency is preserved, not
  flattened). Safe to re-save repeatedly — no-ops once already small enough.
- **`toons/models.py`** — `ToonPanel` now auto-downscales to
  `IMAGE_MAX_WIDTH = 800` (the webtoon-standard width from earlier).
- **`blog/tests.py`** / **`toons/tests.py`** — 7 new tests covering: downscale
  happens, small images untouched, idempotent re-save, PNG transparency
  preserved, PostImage (gallery) field also covered. All passing alongside
  the existing 11 `engagement` tests (18/18).
- **`toons/migrations/__init__.py` + `0001_initial.py`** — resolves the
  migration gap flagged earlier (missing `__init__.py`, orphaned `0003`
  depending on a nonexistent `0002`). Generated fresh from current
  `models.py`, confirmed it applies cleanly via `migrate`.
  **Please read this carefully before applying:** this assumes the old,
  broken `0003` migration was never actually applied against a real
  database anywhere (dev-only, disposable data). If `0003` *is* already
  applied somewhere with real data riding on it, this is the wrong fix —
  say so before you copy this in, and I'll work out a different path
  (writing real `0001`/`0002` migrations that match what's already applied).
- **`humrine_site/settings/social_auth.py`** — replaced 3 deprecated
  allauth settings (`ACCOUNT_EMAIL_REQUIRED`, `ACCOUNT_USERNAME_REQUIRED`,
  `ACCOUNT_AUTHENTICATION_METHOD`) with their current equivalents
  (`ACCOUNT_LOGIN_METHODS`, `ACCOUNT_SIGNUP_FIELDS`). Found as warnings
  while testing, not something you'd already been told about.
- **`docker-compose.vm.yml`** — this is the db/redis/mail/cypress version
  from a few turns ago. It didn't make it into your last commit (the repo
  still had the original 4-service file) — re-applying it here.

## In `gocd-server` (separate repo)

- **`Scripts/deploy.js`** — the Cypress build-context copy patch, same as
  before. This also didn't make it into your last commit. Re-confirmed
  syntax-valid with `node --check`, and re-confirmed it's a no-op for
  badminton_court's deploys (missing `scripts/` dir there, same as before).

## Already correctly committed — not re-delivered
`manage.py`/`wsgi.py`/`asgi.py` settings module fix, `static.py` ENVIRONMENT
import, `base.py` INSTALLED_APPS + middleware, `__init__.py` ROOT_URLCONF
removal, `urls.py` wiring, the full `toons` app restoration, the full
`engagement` app, `requirements.txt` additions, and `Dockerfile.cypress`
(correctly using npm, not badminton_court's pnpm) are all already in the
repo as committed. Verified by re-cloning and checking, not assumed.

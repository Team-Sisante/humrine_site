# Phase 1 — How to apply this

All new files (entire `profiles/` app) — just copy the whole folder in.
Modified files — diff against your current versions before overwriting.

## New: `profiles/` app (entire folder)
Model, decorator, signal, views, forms, admin, templates, migration, and
**16 committed tests** (`profiles/tests.py`) — all passing. Pulled forward
from the Phase 6 plan since they test Phase 1 code specifically.

## Modified
- **`humrine_site/settings/base.py`** — added `'profiles'` to `INSTALLED_APPS`
  (after `engagement`, before `core` — `core`'s adapter now imports from
  `profiles`, so it needs to come after).
- **`humrine_site/urls.py`** — added `path('', include('profiles.urls'))`.
  Confirmed no collision with `home.urls`'s own `''` registration — `/`,
  `/blog/`, `/toons/` all still resolve correctly; `profiles.urls` only
  defines `dashboard/` and `profile/complete/` as sub-paths.
- **`core/management/adapters.py`** — added the `_check_profile_completion`
  method. **This was a real, already-existing bug, not something I
  introduced:** `CustomSocialAccountAdapter.get_login_redirect_url` already
  called `CustomEmailAdapter._check_profile_completion(self, request, url)`,
  but that method didn't exist anywhere — every social login would have
  hit `AttributeError`. Someone had clearly started wiring up exactly this
  profile-completion feature before and left the hook dangling; I
  implemented it rather than leaving it broken or building a parallel
  mechanism.
- **`toons/models.py`** — added `ToonStory.get_absolute_url()`, matching
  `Post.get_absolute_url()` (which already existed). Needed so the
  dashboard template can link back to either content type the same way:
  `{{ comment.content_object.get_absolute_url }}` regardless of whether
  it's a blog post or a toon story.

## What this gets you
- `/dashboard/` — "My Activity": your own comments + reactions (via
  `engagement`'s `related_name`s), with a completion nudge if needed.
  **Not** gated by the decorator itself (would be a redirect loop) —
  always viewable once logged in, same as badminton_court's `index` view.
- `/profile/complete/` — display name (required) + avatar (optional,
  auto-resized to 400px via the existing `image_utils.py` helper) + short
  bio (optional). Redirects back to wherever you were trying to go
  (`session['profile_next']`), or the dashboard by default.
- `profiles.decorators.require_completed_profile` — ready to apply to
  `engagement`'s comment/reaction views in Phase 2. Not applied yet.
- `LOGIN_REDIRECT_URL = '/dashboard/'` (already set in `social_auth.py`
  from earlier work) now actually resolves to something real instead of
  404ing — that was true before this Phase 1 landed, for anyone logging in
  on the live site right now.

## Design choices worth knowing about
- **`profile_complete` is a computed property** (`bool(display_name.strip())`),
  not a stored column — one less thing that can drift out of sync with the
  actual data, at the cost of a tiny bit more computation per check (negligible
  here).
- **Both regular and social signups get an incomplete profile**, not just
  social like badminton_court. `display_name` is deliberately never
  pre-filled from the auto-generated `username` (allauth generates one from
  the email since the signup form only collects email/password) — doing so
  would make every profile trivially "complete" already and defeat the point.
- Every place that touches `request.user`'s profile uses `get_or_create`,
  not a direct `.get()` — covers superusers and any user created outside
  the normal allauth signup flow (the signal only fires on new signups
  going forward).

## Verified, not just written
Ran in an isolated sandbox (fresh sqlite, dummy env vars, real venv):
`makemigrations`/`migrate` clean, `check` clean (1 unrelated pre-existing
CKEditor warning), full 34-test repo-wide suite passes (18 prior +
16 new), and a manual end-to-end pass through Django's test client and
`RequestFactory` covering: signup → incomplete profile → dashboard nudge →
empty-name rejection → real completion → redirect-back → decorator
gating a dummy protected view → the adapter fix → avatar resize. Not
verified: your actual Windows/Docker environment, or a real deploy.

## Not done (later phases per the task doc)
Gating `engagement`'s comment/reaction views (Phase 2), comment edit/delete
(Phase 3), nav links for Dashboard/Profile/Logout (Phase 4), Cypress
`.feature` files (Phase 5), the remaining Phase 6 tests (engagement-gating
specifically, once Phase 2 lands).

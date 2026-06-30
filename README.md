# Phase 1 + Phase 2 — combined delivery

**Important context first:** when I started Phase 2, I checked the real
`Team-Sisante/humrine_site` repo and the `profiles/` app from Phase 1 wasn't
there — it hadn't been committed yet. So this zip contains **both phases
together**: apply this whole thing in one pass, you don't need last
session's Phase 1 zip as well.

I also found `engagement/static/` (the JS/CSS for AJAX comments and
reactions) was missing from the real repo entirely — only the Python side
had landed. `_comments_reactions.html` references those files via `{%
static %}` tags that were 404ing. Recreated both, with the Phase 2 fix
built in from the start. Right now, without this, the comment/reaction
buttons on the live site don't do anything via JS — only a plain-HTML form
fallback would work, and even that's untested without the rest of this.

## New: `profiles/` app (entire folder) — Phase 1
Model, decorator, signal, views, forms, admin, templates, migration, 16
tests.

## New: `engagement/static/` (js + css) — recreated, was missing
Same content as originally built, with Phase 2's `profile_incomplete`
handling included from the start (see below).

## Modified — Phase 1
- `humrine_site/settings/base.py` — `'profiles'` added to `INSTALLED_APPS`
- `humrine_site/urls.py` — `path('', include('profiles.urls'))` added
- `core/management/adapters.py` — added `_check_profile_completion`, a
  method that was already being **called** by
  `CustomSocialAccountAdapter.get_login_redirect_url` but didn't exist
  anywhere — every social login would have hit `AttributeError`. Pre-
  existing bug, not something I introduced.
- `toons/models.py` — added `ToonStory.get_absolute_url()` so the
  dashboard can link to either content type uniformly.

## Modified — Phase 2 (this session)
- `engagement/views.py` — `@require_completed_profile` applied to
  `add_comment` and `toggle_reaction`, between `@login_required` and
  `@require_POST`.
- `profiles/decorators.py` — **rewritten**, not just "applied as-is."
  Found two real problems while wiring it into engagement's POST-only
  AJAX endpoints that wouldn't show up gating a normal page view (which is
  all badminton_court's original version ever had to handle):
  1. **Redirect-back target.** The gated views are API endpoints, not
     pages — stashing `request.get_full_path()` for a POST to e.g.
     `/engagement/react/blog/post/3/` would mean the post-completion
     redirect tries to **GET** that same URL, which 405s (`@require_POST`-
     only). Fixed: GET requests stash the current path (still correct for
     a real page-view use case); non-GET requests stash `HTTP_REFERER`
     instead (the actual page the action fired from), falling back to the
     path only if Referer is missing.
  2. **AJAX requests got a blind 302.** `fetch()` follows redirects
     silently — the caller would receive the complete-profile page's HTML
     where it expected JSON, `res.json()` throws, and the promise
     rejection goes uncaught. No feedback to the user at all. Fixed: AJAX
     requests now get `JsonResponse({'ok': False, 'profile_incomplete':
     True, 'redirect': ...}, status=403)` instead.
- `engagement/static/engagement/js/engagement.js` — both fetch handlers
  (reactions and comments) now check for `data.profile_incomplete` first
  and navigate the browser to `data.redirect` if so, before falling
  through to the existing success/failure handling.
- `engagement/tests.py` — **fixed a regression I found, not just added
  tests.** The existing 11 tests never gave their users a completed
  profile — applying the gating broke 7 of them (confirmed: ran the suite
  before fixing, got 4 failures + 3 errors). Fixed by having `setUp()`
  create completed profiles for the existing test users, so those tests
  go back to testing comment/reaction *behavior*, not accidentally
  re-testing gating in every single one. Added a new
  `EngagementProfileGatingTestCase` (8 tests) specifically for the gating
  itself: AJAX blocking with structured JSON, non-AJAX real redirects,
  Referer-based redirect-back target (and its fallback), the full
  blocked→complete→retry loop, a blank-but-existing profile still being
  blocked, and anonymous users being unaffected.

## Verified, not just written
Ran in an isolated sandbox (fresh sqlite, dummy env vars, real venv,
**this session's actual current `requirements.txt`** — it had grown since
Phase 1, several new required env vars surfaced and were supplied):
- `migrate`/`check` clean (1 unrelated pre-existing CKEditor warning)
- Full repo-wide suite: **42/42 passing** (18 original + 16 profiles +
  19 engagement, net of the 11→19 engagement growth)
- Manual end-to-end via Django's test client: AJAX comment/reaction
  blocked with structured JSON when incomplete; `profile_next` correctly
  uses Referer (confirmed NOT the API endpoint URL, which would have
  405'd); non-AJAX gets a real redirect; full loop (blocked → complete
  profile via the actual form → land back on the **exact** originating
  page, not just the bare dashboard) confirmed working end-to-end; same
  profile completeness check confirmed shared correctly across different
  client sessions for the same user (not session-scoped).

**Not verified:** your actual Windows/Docker environment, a real deploy,
or the JS in an actual browser (DOM/fetch behavior reasoned through and
mirrors the existing reaction/comment success-path code exactly, but
never executed outside Django's test client).

## Not done (later phases per the task doc)
Comment edit/delete (Phase 3), nav links for Dashboard/Profile/Logout
(Phase 4), Cypress `.feature` files (Phase 5), remaining Phase 6 items.

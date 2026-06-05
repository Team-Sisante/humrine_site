<!-- AI ASSISTANT NOTE: Always refer to this document and update it as tasks are completed or architecture changes. Do not remove this note! Also do not remove the history of modifications. [HARD RULE] When editing, ALWAYS preserve ALL existing content. Only ADD new entries or UPDATE existing ones. NEVER delete or shorten the history.
[RULE] Every roadmap document MUST be updated by the engineer after any significant decision, finding, code fix, or task completion to ensure project state transparency.
[RULE] You should always update these roadmap documents on our decisions, findings, fixes and next tasks after doing the updates/changes/modifications.
-->

# Roadmap: Affiliate Marketing Integration (Lazada & Shopee)
# affiliate_marketing/Docs/Roadmap.md

This document outlines the plan to integrate affiliate marketing into the Django web app, with initial focus on Lazada, Shopee, and (optionally) Involve Asia, using a clean link‑tracking layer.

---

## Phase 1: Core Affiliate Link Tracking System

- [ ] **1.1 – Model for Tracked Links**  
  Create `TrackedAffiliateLink` model (`original_url`, `slug`, `title`, `merchant`, `created_at`).  
  Add `AffiliateClick` model for click analytics (`link`, `ip`, `user_agent`, `referer`, `clicked_at`).

- [ ] **1.2 – Redirect View & URL**  
  Implement `affiliate_redirect(request, slug)` that logs a click and redirects to `original_url`.  
  Wire it to `/out/<slug>/`.

- [ ] **1.3 – Template Tag**  
  Build `{% affiliate_url slug %}` template tag to output the cloaked URL (e.g., `/out/best-mouse/`).

- [ ] **1.4 – Admin Registration**  
  Register both models in Django admin for quick link management and click log inspection.

- [ ] **1.5 – Manual Link Generation Flow**  
  Document how to obtain Lazada/Shopee affiliate links and create corresponding `TrackedAffiliateLink` entries (either via admin or a management command).

---

## Phase 2: Lazada & Shopee Direct Affiliate Programs (Manual Links)

- [ ] **2.1 – Affiliate Account Sign‑up**  
  Register for Lazada Affiliate Program (PH) and Shopee Affiliate Program (PH).  
  Confirm payment details (bank/GCash) and minimum payout thresholds.

- [ ] **2.2 – First Product Links**  
  Manually generate 5–10 affiliate links from each platform via their dashboards.  
  Store them in `TrackedAffiliateLink` and display on a test page.

- [ ] **2.3 – Disclosure & Compliance**  
  Add FTC‑style disclosure notice on pages containing affiliate links.  
  Ensure all links use `rel="nofollow sponsored"`.

- [ ] **2.4 – Cookie & Policy Considerations**  
  Review whether click tracking stores personal data under GDPR/Philippine law; if needed, implement consent mechanism or IP anonymisation.

---

## Phase 3: Involve Asia Integration (Optional, Multi‑Merchant API)

- [ ] **3.1 – Involve Asia Publisher Account**  
  Sign up as a publisher on Involve Asia and obtain API credentials.

- [ ] **3.2 – API Client in Django**  
  Write a service module (`involve_api.py`) to:  
  - Search products across Lazada, Shopee, and other merchants.  
  - Retrieve deep links / coupon codes.  
  - Cache results to avoid rate limits.

- [ ] **3.3 – Dynamic Product Catalogue (Optional)**  
  Build a view that pulls live products from Involve Asia and renders them, each wrapped with our cloaked redirect.

- [ ] **3.4 – Fallback & Error Handling**  
  Graceful degradation if the API is unavailable; show cached data or a placeholder.

---

## Phase 4: Analytics Dashboard & Reporting

- [ ] **4.1 – Basic Click Stats**  
  Create a simple view (e.g., `/affiliate/stats/`) that shows clicks per link, per day, and per merchant, using `AffiliateClick` data.

- [ ] **4.2 – Export & Filtering**  
  Add date range filters and CSV/Excel export for clicks.

- [ ] **4.3 – Conversion Attribution (Future)**  
  (Stretch) Integrate conversion pixels or server‑side postbacks if the networks support it.

---

## Phase 5: Own Affiliate Program (Inbound) – Future Scope

- [ ] **5.1 – Affiliate User Model**  
  `Affiliate` model linked to `User`, with `referral_code`, `commission_rate`, `total_earnings`.

- [ ] **5.2 – Referral Tracking**  
  Landing page `/ref/<code>/` that sets a cookie and logs a `ReferralClick`.  
  Attribute sign‑ups/purchases to the referring affiliate.

- [ ] **5.3 – Affiliate Dashboard**  
  Let affiliates view their clicks, conversions, and earnings.  
  Admin tools to mark payouts.

---

## Key Decisions & Architecture Notes

- **Link ownership:** All outbound affiliate links go through our own redirect (`/out/<slug>/`). This gives us full click analytics independent of the networks.
- **Merchant flexibility:** The `TrackedAffiliateLink` model supports any merchant (Lazada, Shopee, or Involve). We can add more later without code changes.
- **Cookie vs. IP tracking:** Clicks are logged with IP and user‑agent for spam filtering, but privacy‑first approach should be documented.
- **Involve Asia priority:** If we later need dynamic product feeds, Involve Asia’s unified API is the preferred route over scraping or per‑merchant APIs.

---
*Last Updated: 2026-06-05*
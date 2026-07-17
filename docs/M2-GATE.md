# M2 Gate — Vendor Decision, Money Map & Scope
**For:** CEO · **From:** CTO · **Date:** 2026-07-18 · **Status:** awaiting CEO answers (4 questions at bottom)

## 1. Backend vendor: Supabase vs Firebase (costed)

| | **Supabase** (my recommendation) | **Firebase** (spec §8.1 original pick) |
|---|---|---|
| Fits our data | Postgres + SQL — our Appendix-A relational content, rules versioning, RLS per-user privacy | Firestore NoSQL — fine, but content model is relational |
| Auth | Email + Apple + Google + magic link, built-in, RLS-integrated | Email + Apple + Google, mature |
| Cost now (dev) | **$0** Free tier (50K MAU, 500MB) — pauses after 7d idle, fine for dev | $0 Spark (50K reads/day) |
| Cost at pilot (~30–500 users) | **$0–25/mo** (Free works; Pro $25 when public) | ~$0–20/mo metered |
| Cost at 10K MAU | ~$25–75/mo predictable flat+overage | Per-read/write billing — less predictable, can spike |
| Functions (M4 coach gateway) | Edge Functions (Deno) — 500K invocations free | Cloud Functions — 2M free |
| Lock-in | Open source, self-hostable, standard Postgres | Google-only |
| **Executable in THIS workspace** | ✅ **Supabase MCP is wired in — I can create schema/auth/functions directly today** | ❌ No console/Admin SDK access here — you'd do console work manually |
| Push notifications | Via FCM later anyway (native shell) | FCM native — genuine Firebase advantage at M5 |
| Offline sync | App-level (we own it) | Strong built-in offline — advantage Firebase |

**Recommendation: Supabase.** Decisive factors: (1) it's the only vendor I can fully operate from this workspace — everything else would hand you manual console work; (2) SQL fits the content/rules model; (3) predictable flat pricing; (4) RLS enforces our privacy architecture at the DB layer. This deviates from spec §8.1's Firebase choice — the spec's own repository-abstraction rule was written for exactly this swap. FCM can still be added for push at M5 regardless.

## 2. Money map (what costs, when)
| Item | When | Cost |
|---|---|---|
| Supabase Free project (dev) | M2 build, now | **$0** |
| Stripe account (web checkout pilot) | M2, optional pilot path | $0 setup; 2.9% + 30¢/charge |
| RevenueCat | M5 native shell | $0 until ~$2.5k monthly tracked revenue, then ~1% |
| Apple Developer Program | Needed for TestFlight/store (M5, or earlier if you want) | $99/yr — **your account** |
| Google Play Console | Store listing (M5) | $25 one-time — **your account** |
| Supabase Pro | Only when pilot goes public-facing | $25/mo |
| **Total required to start M2 build** | | **$0** |

## 3. The pilot-payment insight (changes M2 shape)
The PWA can take **real web payments via Stripe Checkout today** — no app store, no approval delay, no 15–30% store cut. For the 30-user paid pilot this is the fastest, cheapest revenue path and it validates WTP (willingness-to-pay) before the native shell exists. RevenueCat + store IAP still arrives with the native shell at M5. I recommend pilot monetization = **Stripe web checkout** (annual $49.99 / monthly $9.99 with 7-day trial, same prices).

## 4. M2 scope proposal
**Buildable here, now ($0):**
1. Supabase project + schema (users, profiles, safety_answers, inventory, plans, plan_days, session_logs, check_ins, consents, captures_meta (no photos — on-device stays default), entitlements, coach_threads, support_tickets) + RLS policies + migrations
2. Auth: email magic-link + password reset in-app (Apple/Google OAuth need your store/dev accounts — stubs + config ready)
3. Sync layer: opt-in (consent-gated, per our privacy architecture), localStorage ↔ Supabase, last-write-wins per entity, offline queue
4. Entitlement: server-side source of truth (`entitlements` table + edge function verification); Stripe webhook handler (edge function) for the pilot path; RevenueCat-ready interface
5. Paywall rewired: real Stripe Checkout (test mode → live when you say), restore = server entitlement check; keeps store-compliant copy
6. Support & refund tooling: in-app support form → tickets table + triage view; 48h refund-honor policy page; admin-lite screen
7. Unit-economics model: `docs/UNIT-ECONOMICS.md` + calculator (CAC/LTV/churn scenarios at our price points)
8. Migration path: first-login import of existing local data; export/delete now server-side too (GDPR-correct)
9. Verifier v5: auth flow tests, RLS policy tests, webhook signature tests, sync conflict tests, entitlement-gating tests
**Not buildable here (yours / later):** Apple/Google OAuth credentials, store accounts, real push notifications, native IAP sandbox.

## 5. Acceptance criteria (M2 exit)
- New user: sign up → onboarding → data syncs → entitlement=false → paywall → Stripe test purchase → entitlement=true server-side → PRO unlocks on second device/browser
- RLS: user A can never read user B's rows (tested)
- Webhook: forged signature rejected (tested); refund/cancel downgrades entitlement (tested)
- Sync: offline changes merge without loss (tested)
- Docs: unit economics + pilot plan + refund policy shipped

## 6. Questions for CEO
1. **Vendor:** Supabase (recommended) / Firebase / stay local for now?
2. **Spend:** OK to create the Supabase **Free** project now ($0)? Pro ($25/mo) only when pilot goes public?
3. **Pilot payments:** Stripe web checkout (recommended) / wait for store IAP at M5?
4. **M2 scope** as Section 4 — approve?

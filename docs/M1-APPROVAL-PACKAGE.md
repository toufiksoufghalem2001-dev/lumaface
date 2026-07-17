# LumaFace — Milestone 1 Approval Package
**For:** Founder & CEO · **From:** CTO · **Date:** 2026-07-17
**Status of prerequisite work:** Market research ✅ · CTO review ✅ (`docs/CTO-REVIEW.md`) · Design revision ✅ (`design/` — 13 files, verifier v2 ALL PASS 24/24) · Production coding ⛔ awaiting your approval (this document).

---

## 1. Final recommended MVP (Milestone 1)

**LumaFace — AI Facial Care Coach, Experience MVP**: an installable mobile web app (PWA) for Android + iOS home screens that delivers the complete Milestone-1 product experience of your Master Spec with on-device-only data — usable immediately for a friends-and-family pilot and as the validated blueprint for the native build.

**In scope (all per spec):**
1. **9-step onboarding**: welcome + privacy promise + **18+ adult confirmation** → goals (max 3 of 9) → **safety screening** (7 contraindication checks with kind referral messaging) → routine inventory (products/actives) → routine time (3/5/10 min) → camera & privacy explainer → plan building → **personalized plan reveal** → soft, skippable paywall.
2. **Deterministic safety & plan rules engine** (`rules@2026.07.1`) — all 8 Appendix-B hard rules (SAFE-PREG-RET, EYE-01, FACE-01, PROC-01, SKIN-01, IRR-01, JAW-01, BODY-01), pure and unit-tested; it is the single authority over what any user sees.
3. **24-activity expert content library** (8 free / 16 PRO) in 6 categories — skincare foundation (Tier A), facial massage & de-puff (B), face movement (C), eye & forehead (B/C), neck & posture (B/C), relaxation (B) — every record with steps, breathing cue, contraindications, stop conditions, evidence-tier badge, honest "expected outcome", sources, and a serene code-drawn SVG illustration (diverse skin tones & hair; **no defect marks, ever**).
4. **Today** (personalized duration-aware ritual, streak, habit ring, daily tip) · **AM/PM skincare routine** with cautions · **Activity player** (guided breathing ring, phase cues, safety box, post-session comfort prompt).
5. **28-day adaptive program** (Reset → Consistency → Target → Review) with **weekly check-ins** whose visible reward is a plan adjustment (PlanDiffCard: paused/kept/added with reasons; irritation → barrier-reset branch).
6. **Progress**: habits heatmap, serif stats, badges (habits only, never appearance), **consent-gated on-device photo diary** ("your photos never leave this device", per-photo delete, honest "no reliable comparison" state, hide-comparison toggle per body-image safeguards).
7. **AI coach (Preview, honestly labeled)**: bounded chat answering only from the approved library, using the spec's exact structured response contract (intent/summary/actions/warnings/confidence/sources/professional-review flag), safety redirects, 3 free questions/day.
8. **Monetization**: soft paywall — **Annual $49.99 hero (7-day free trial, real savings shown)** + **Monthly $9.99**; no weekly plan ever; visible close; restore purchase; cancel-anytime guidance; full renewal fine print; free tier per spec §11.1 genuinely usable. Purchases simulated in this build and clearly labeled "Demo build — no real charge".
9. **Trust & compliance surface**: canonical wellness disclaimer on every evidence-relevant screen, AI disclosure, Help/"when to see a professional" screen, privacy controls (consent toggles default-off, export my data JSON, delete-all double-confirm), evidence-tier explainer.
10. **PWA essentials**: manifest, service worker, icons, install prompt; Capacitor-ready config for store wrapping; RTL-ready layout (logical CSS, no hardcoded direction).

## 2. Features removed or postponed (vs. Master Spec end-state)

| Feature | Decision | Why |
|---|---|---|
| Flutter native app (spec §8.1) | **Postponed to M5** | No Flutter/Xcode/Android SDK in this workspace — native code written here would be untestable (violates our quality bar). PWA first = real users + validated UX before the 4–6-month native investment. Content/rules/contracts are built byte-portable. |
| Firebase backend, accounts, cloud sync | **Postponed to M2** | M1 is single-device on-device by design (matches spec privacy defaults). Vendor decision (Firebase vs Supabase) deferred to M2 gate with cost model. |
| Real payments / RevenueCat | **Postponed to M2** | Needs store presence + backend entitlement source-of-truth. M1 paywall is a labeled simulation to validate conversion UX. |
| Live camera form-coaching (MediaPipe) | **Postponed to M3** | Hard, unproven for retention; spec's own investment principle says prove rule-based personalization first. M1 ships the consent/explainer UX and a clearly-labeled teaser slot. |
| Real LLM coach gateway | **Postponed to M4** | Needs server (secrets off-client), safety classifier, red-team eval. M1's retrieval-only Preview uses the same response contract, so UI is unchanged at swap-in. |
| Arabic / RTL + French | **Postponed to M4** | ~30–40% content/QA cost; architecture is RTL-ready from day one (cheap now, expensive later). English-first pilot. |
| Skin-appearance CV (spec §5.4) | **Postponed to M6, gated** | Requires expert validation, subgroup fairness testing, model card, legal review — exactly as the spec says. |
| Video content | **Postponed** | M1 uses code-drawn illustrations + text cues (zero production cost, zero licensing risk); video shoots enter with creator programs in M4/M5. |

## 3. Features added or changed (vs. GlowFace prototype & spec)

| Change | Reason |
|---|---|
| **Rebrand GlowFace → LumaFace** | Spec's preferred working name; broader than face yoga (skincare + massage + movement + posture + coach). |
| **Face-yoga-only → full facial-care coach** | Spec §3: skincare foundation is the core value (Tier A evidence); face yoga repositioned as Tier-C optional module with honest framing — this is also our *store-rejection insurance*. |
| **Added deterministic safety rules engine + screening** | Spec MUST (Appendix B). Nothing renders without the engine's say-so. |
| **Added evidence-tier badges (A/B/C) everywhere** | Spec §2 claims framework + our trust wedge vs. competitors' overclaiming. |
| **Added weekly check-in with visible plan adjustment** | Spec §11.4 retention loop; the adjustment *is* the reward (addresses weakness W7 in my review). |
| **Added AM/PM skincare routine screen** | Spec §3.1/§6 — the daily habit anchor. |
| **Added AI coach Preview (structured, bounded)** | Spec §4.3 contract implemented exactly; labeled Preview — no fake-AI trust damage. |
| **Pricing: prototype's $4.99/mo + $29.99/yr → $9.99/mo + $49.99/yr** | Spec §11.2 ranges (€7.99–12.99 / €39.99–69.99) + RevenueCat category medians; yearly hero with 7-day trial converts best (research: card-required trials ~48.8% trial→paid). |
| **Removed weekly plan** | Spec §11.3/§10.3 + research: weekly pricing is the #1 trust-killer in this category (FaceJoy/Facetory complaints). |
| **Added age gate (18+)** | Spec §10.4 + June 2026 UK scrutiny of teen looksmaxxing — we actively distance from it. |
| **Added privacy controls (consent toggles, export, delete)** | Spec FR-008/FR-009 + store data-safety requirements; also a marketing asset. |
| **Comfort prompt after every session** | Feeds SessionLog + plan engine (spec FR-006) — personalization data without free-text privacy risk. |

## 4. Final user journey

**First run:** Install/open → welcome (promise + "your data stays on this device" + 18+ confirm) → pick up to 3 goals → safety screening (kind, 60 seconds; anything flagged → gentle guidance, never scary) → routine inventory → choose 3/5/10 minutes → camera & privacy explainer (what we never infer; consents default-off) → "building your ritual…" → **plan reveal** (today + week 1 + *why* these items + honest expectations) → soft paywall (skippable; free tier starts immediately either way).
**Daily:** open → Today (greeting, streak, today's 3–8-minute ritual: AM skincare + 1–3 activities) → guided session (breathing ring, step cues, safety box) → comfort prompt → done (petals, streak) → optional tip/coach question.
**Weekly:** check-in prompt (comfort, irritation?, adherence) → **"your week, adjusted"** (paused/kept/added with reasons) → optional standardized photo (consent) → program advances Reset→Consistency→Target→Review.
**Anytime:** Library browse by concern/category with tier badges · Coach (Preview) questions · Progress (habits, photos) · Profile (reminders, consents, export/delete, legal, help).
**Upgrade moment:** locked activity/program week → paywall (value recap, $49.99/yr hero, 7-day trial, close visible) → simulated PRO in this build.

## 5. Final technical architecture (M1)

```
React 19 + TypeScript + Vite 7 + Tailwind 3.4 + framer-motion + lucide-react
└── src/
    ├── lib/rules.ts         ← deterministic safety/plan rules, versioned 2026.07.1 (pure, framework-free)
    ├── lib/rules.test.ts    ← vitest: one test per SAFE-* rule + plan invariants
    ├── lib/plan.ts          ← deterministic 28-day plan builder (goals × time × safety → Plan)
    ├── lib/store.tsx        ← AppProvider; localStorage lf_* keys per spec entity names
    ├── data/activities.ts   ← 24 Appendix-A records (ports 1:1 to future Firestore importer)
    ├── data/program.ts · content.ts
    ├── components/          ← phone-frame Layout, TopBrandBar, BottomTabBar, Sheet,
    │   │                      ProgressRing, StepCue, SafetyBox, EvidenceTierBadge, ConsentToggle,
    │   │                      ComfortPrompt, PlanDiffCard, CoachBubble, CompareSlider, PetalConfetti…
    │   └── illos/           ← 24 code-drawn SVG faces + MarkPetal + Petal (no external imagery)
    └── pages/               ← 14 routes (onboarding, today, routine, library, activity×3,
                               program, checkin, progress, coach, paywall, profile, help)
PWA: manifest + service worker + icons · capacitor.config.json (store-wrap path) ·
Persistence: localStorage only (photos as data-URLs, never uploaded) · Tests: vitest rules suite ·
Quality gates: verifier v3 (build pass, rules tests, claims scan on code, route/PWA checks)
```
**Key invariants:** UI never bypasses the rules engine · safety content never paywalled · no network calls with user data (M1 has zero backend) · structured coach contract mirrors §4.3 exactly.

## 6. Milestone roadmap
- **M0 ✅ Research & strategy** (competitors, monetization, CTO review, design system)
- **M1 ⏳ Experience MVP (PWA)** — *awaiting your approval* — full journey above; acceptance: clean build, 8/8 rules tests pass, zero prohibited claims in code, disclaimer coverage, free tier usable end-to-end.
- **M2 Accounts + backend + real subscriptions** (vendor gate: Firebase vs Supabase; RevenueCat/Stripe; support & refund tooling; unit-economics model) → enables 30-user paid pilot.
- **M3 Camera v1** (consent flow, on-device capture-quality checks, comparable-photo gate).
- **M4 AI coach gateway + Arabic/RTL** (server RAG, safety classifier, red-team eval, native-speaker content review).
- **M5 Native shell + store submission** (Flutter or Capacitor gate, CI, privacy labels, sandbox IAP, beta, ASO).
- **M6 Advanced vision research** (gated per spec §5.4).
Kill criteria (agreed targets): pilot ≥30 paid, ≥40% complete 4+ sessions/wk, monthly churn <8%, refunds <5%.

## 7. Specialist team for Milestone 1 (smallest high-quality team)

| Role | Agent | Narrow task | Status |
|---|---|---|---|
| User-research + subscription strategist | research agent ×2 (parallel) | Competitor & monetization briefs | ✅ done, released |
| UX/UI designer | Pro_Designer | LumaFace design system + 12 screen specs | ✅ done, released |
| **Core platform engineer** | scaffold agent | PWA shell, theme, rules engine + tests, data catalog, plan builder, store, shared components, illustrations, Today screen, PWA packaging | pending approval |
| **Feature engineer A** | onboarding agent | 9-step onboarding + plan reveal (consumes rules/plan/store) | pending |
| **Feature engineer B** | library/routine/player agent | Library + Activity detail/session/done + AM/PM routine | pending |
| **Feature engineer C** | program/progress agent | 28-day program + weekly check-in + progress & photo diary | pending |
| **Feature engineer D** | coach/monetization agent | Coach preview + paywall + profile/settings + help | pending |
| **QA & compliance (me, CTO)** | orchestrator | Merge, build gate, rules tests, claims scan, verifier v3, acceptance vs. criteria | continuous |

Roles deliberately **not** recruited for M1 (no value yet): Flutter, Firebase, MediaPipe, RevenueCat engineers, Arabic/RTL specialist, dermatology reviewer (content follows AAD guidance already cited in spec; expert review contracts are a pre-M5 founder task), store compliance reviewers (needed at M5), analytics/performance engineers (M2+). Every agent gets: the spec path, its design file(s), hard constraints (no Tier-D claims, rules engine is authority, don't touch shared files outside scope), and must report assumptions/decisions/limitations/unfinished work; I review all output before merging.

## 8. Risks & unresolved business decisions

**Top risks:** category churn after week 1 (mitigated: check-in plan-diff reward, 3/5/10-min flexibility, honest expectations) · store health-claims scrutiny (mitigated: tier language, legal review at M5) · trust damage from any billing ambiguity (mitigated: no weekly plan, visible cancel, refund-honor policy at M2) · rules-engine bug (mitigated: one test per rule, engine as single gate).
**Unresolved (yours to decide):**
1. **Platform path** (my recommendation: PWA M1 → native at M5; you may override to Flutter-first elsewhere).
2. **Pricing confirmation**: $9.99/mo + $49.99/yr + 7-day trial (within your spec's ranges).
3. **Brand name**: "LumaFace" (spec's preferred placeholder) — trademark/domain check is a founder task before M5.
4. **M2 backend vendor** (Firebase per spec vs. Supabase — I'll bring a costed comparison at the M2 gate; no money spent in M1).
5. **Pilot audience**: friends-and-family (free) is assumed for M1 validation; any paid acquisition waits for M2 + your budget approval.

## 9. Questions requiring your approval now
1. Approve M1 scope & user journey as above? (Sections 1–4)
2. Approve pricing: **$9.99 monthly / $49.99 annual hero / 7-day trial / no weekly plan**?
3. Approve platform strategy: **PWA now, native at M5**?
4. Approve brand working name **LumaFace** for this build?

On approval I start production immediately and manage M1 autonomously, reporting at milestone completion with test evidence.

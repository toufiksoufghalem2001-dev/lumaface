# LumaFace — CTO Review, Roadmap & Development Strategy
**Author:** CTO (technical co-founder) · **Date:** 2026-07-17 · **Status:** v1 — living document
**Inputs reviewed:** Master Product Spec (17 Jul 2026), GlowFace prototype, market research (competitors + monetization briefs), CEO charter.

---

## 1. Verdict on the Master Spec

The spec is unusually strong for a pre-build document: the safety architecture (deterministic rules over LLM), evidence-tier claims framework, on-device-first camera policy, and "prove rule-based personalization before skin AI" investment principle are exactly the right calls. **I endorse building it.** What follows is my honest review — where it is weak, what is missing, and what I would change before spending money.

### 1.1 Strengths (keep, non-negotiable)
- Deterministic, versioned safety/plan rules as the authority; LLM only explains approved content. This is the single most important architectural decision in the document.
- Evidence tiers A–D with permitted language — directly maps to App Store 1.4.1 / Google Health declarations and protects us from the #1 category complaint (overclaiming).
- On-device camera processing, consent-gated photo storage, no forbidden inferences. This is both ethical and a *marketing asset* in a category full of scammy apps (our research: Luvly/FaceYoga.com review profiles are dominated by billing-trust complaints).
- Free tier that is genuinely useful (§11.1) + honest paywall principles (§11.3). Matches conversion research: card-required 7-day trials convert ~48.8% trial→paid; transparent billing reduces refund/churn risk.
- "Self-comparison, never ranking" progress philosophy. Good for retention *and* body-image safety.

### 1.2 Weaknesses & gaps (my review — CEO visibility)
| # | Issue | Severity | My recommendation |
|---|---|---|---|
| W1 | **Flutter-everything bet at MVP.** Flutter + native Swift/Kotlin bridges + Firebase + RevenueCat + MediaPipe is a 4–6 month, 4–5 person build before the first paid signal. Spec's own investment principle says prove value first. | High | **Validate the experience as a mobile web/PWA product first** (M1–M2), keep Flutter for M5 native shell when retention data justifies it. See §4 platform strategy. |
| W2 | **Firebase lock-in** (Auth, Firestore, Functions, App Check, FCM, Crashlytics). Fine at scale, but migration cost is real and Firestore security-rules testing is a common failure point. | Medium | Abstract behind repository interfaces (spec already says this — enforce it in review). Keep the door open to Supabase/Postgres for the relational content/rules data. |
| W3 | **AI coach cost & latency unpriced.** RAG + safety classifier + streaming for every message, at €7.99–12.99/mo price points. No per-user AI cost budget in the spec. | Medium | Cap coach usage on monthly plan (e.g. fair-use), cache common Q&A, small-model-first routing. Model this in unit economics before M4. |
| W4 | **Arabic at launch (FR-015) is underscoped.** Full RTL + Arabic expert content + Arabic AI answers is ~30–40% extra content/QA cost. | Medium | **English-only M1–M3, Arabic in M4** with a native-speaker content review. RTL-ready architecture from day one (no hard-coded LTR layouts) — cheap now, expensive later. |
| W5 | **Camera coaching is Phase 2 but the spec's differentiation leans on it.** MediaPipe on-device at ≥24fps on mid-range Android is achievable but the form-coaching UX (tempo, symmetry feedback) is genuinely hard and unproven for retention. | Medium | Treat live camera coach as an experiment (M3), not the core promise. Core promise = personalized plan + adherence + comparable photos. |
| W6 | **No customer-support / trust-ops plan.** Category reviews show refund-refusal rage is the killer. | High | In-app support + 48h refund-honor policy from M2. Cheap, and directly attacks the incumbents' weakness. |
| W7 | **Weekly-check-in loop is specified but its reward is not.** Adherence products die when the check-in feels like homework. | Medium | Check-in must *visibly change the plan* ("we removed X because of your irritation note") — the adjustment is the reward. Implement in M1 as visible plan-diff. |
| W8 | **Content production pipeline missing.** Spec lists ~30 activities with expert approval metadata but no workflow for producing/reviewing/versioning content at scale. | Medium | Content JSON + review checklist + expert sign-off log in repo from M1; text-first, illustration-based (no video shoots needed for M1). |
| W9 | Store fee math absent: 15–30% store cut + RevenueCat ~1–2% + AI + support on a €49.99 annual. | Medium | Unit-economics sheet in M2 before paid acquisition. |
| W10 | Age confirmation is specified, but store age-rating (Apple 12+/17+ decision, Google questionnaire) and the June-2026 UK looksmaxxing scrutiny mean our **copy must actively distance from jaw-resistance/"mewing" trends** — the spec does this in content but not in store-metadata guidance. | Low-Med | Add store-metadata claim rules to M5 checklist (no "jawline transformation" screenshots). |

### 1.3 Missing parts (spec silent → I am adding to plan)
- **Data-export/delete UX** is in FR-009 but no design for it → M1 Profile includes export/delete (local data now; server later).
- **Offline behavior conflict resolution** (FR-013) — not needed in M1 (single-device localStorage), must be designed before multi-device sync (M2).
- **Notification permission strategy** — opt-in timing matters (ask after first completed ritual, not at install). Added to M1 UX.
- **Accessibility audit plan** (WCAG contrast, text scaling, screen reader) — spec lists requirements; M1 bakes in contrast-checked tokens + reduced-motion; full audit before store.
- **Kill criteria** (§14.2 gates) — good; I add numeric targets: M2 pilot ≥30 paid users, ≥4 sessions/wk completion ≥40%, monthly churn <8%, refund rate <5%.

### 1.4 Improvements I am making unilaterally (technical, per charter autonomy)
1. **M1 as installable PWA** instead of Flutter — see §4.
2. **Activity content model kept byte-compatible with Appendix A** so M1 seed content ports directly into the future Flutter/Firestore importer.
3. **Rules engine as a pure, versioned, framework-free module** (`rules@2026.07.1`) with a self-test harness — the same JSON logic will run in Cloud Functions later. Zero rewrite.
4. **On-device photo diary via local-only storage in M1** — matches spec privacy default and needs zero backend.
5. **AI coach in M1 = honest, bounded demo**: a local, retrieval-only coach over our approved content with the spec's exact structured response contract (intent/summary/actions/warnings/confidence/source_ids/requires_professional_review) and safety redirects. It is labeled as a preview; the real LLM gateway lands in M4. No fake "AI" claims in store copy.

---

## 2. Platform strategy (deviation from spec §8.1 — CEO decision flagged)

**Problem:** This workspace has no Flutter, Xcode, or Android SDK — I cannot compile, run, or test native iOS/Android binaries here. Shipping uncompiled Flutter code would violate our own quality bar (no untested code).

**Options:**
| Option | Pros | Cons |
|---|---|---|
| **A. M1 = React PWA (my recommendation)** | Runnable & testable today; installable on both phones; real users can pilot it; Capacitor wrapper gives a store path; rules engine & content port 1:1 to Flutter later | Not the spec's end-state stack; MediaPipe native bridges deferred |
| B. Write Flutter source blind | Matches spec stack on paper | Unverifiable, untestable here; near-certain rework; violates "no unfinished code" |
| C. Wait for native CI | No wasted work | Zero progress, zero learning |

**Recommendation: A now → Flutter native shell in M5 with full CI (Codemagic/GitHub Actions + macOS runners), when M2–M4 data proves retention.** This follows the spec's own investment principle. **CEO may override — flagging as requested.**

---

## 3. Milestone roadmap (each with acceptance criteria)

### ✅ M0 — Research & validation inputs (COMPLETE)
Market/competitor brief, monetization brief, pricing decision inputs, design references. Exit: briefs on file. **Done 2026-07-17.**

### 🚧 M1 — Experience MVP (PWA) — *this delivery*
**Goal:** A beautiful, installable, fully usable LumaFace experience implementing the spec's M1 product surface with local persistence — usable for friends-and-family pilot.
**Scope:** Onboarding (18+ confirm → goals ≤3 → safety screening → routine inventory → 3/5/10-min choice → privacy explainer → plan reveal → soft paywall) · deterministic rules engine `2026.07.1` (all Appendix B SAFE-* rules) · 20–24 expert-format activities (skincare A / massage B / movement C / posture / relaxation, each with contraindications + stop conditions) · Today personalized ritual · activity player (steps, timer, safety cues) · AM/PM skincare routine · 28-day program (Reset/Consistency/Target/Review) · weekly check-in with visible plan adjustment · progress (habits heatmap, stats, consent-gated on-device photo diary) · bounded local AI coach (structured contract + safety redirects, labeled preview) · paywall ($9.99/mo · $49.99/yr hero · 7-day trial · visible close · restore · trust copy) · profile/settings (reminders UI, export/delete local data, disclaimers, privacy) · help/professional-care screen · PWA (manifest, SW, icons).
**Acceptance criteria:** build passes clean · every SAFE-* rule has a passing self-test · zero prohibited claims/beauty scoring anywhere in code & copy · disclaimer on every evidence-relevant surface · free tier usable without paywall wall · paywall shows full price/interval/trial + close button · photos never leave device.
**Explicitly deferred:** accounts/sync, real payments, camera CV, Arabic, real LLM.

### M2 — Accounts, backend & real subscriptions
Supabase or Firebase (decision gate), auth (Apple/Google/email), cloud sync, RevenueCat/Stripe, entitlement source-of-truth server-side, support + refund tooling, unit-economics model. Exit: sandbox purchase lifecycle green; 30-user paid pilot can start.

### M3 — Camera v1
Consent flow, standardized capture quality checks (blur/exposure/pose) on-device, progress-photo history with comparison quality gate/abstention, graceful denial path. Exit: capture quality metrics stable across low/mid devices.

### M4 — AI coach gateway + Arabic
Server RAG gateway (no client keys), safety classifier, structured outputs, red-team eval suite, Arabic content + full RTL. Exit: AI eval suite passes; native-speaker content review.

### M5 — Native shell & store submission
Flutter (or Capacitor decision gate) with CI, store metadata/claims review, privacy labels/Data Safety, sandbox IAP, beta panel, ASO. Exit: both stores' review passed.

### M6 — Advanced vision research (gated)
Cosmetic attribute estimation only after expert validation + subgroup fairness + model card, per spec §5.4. Not before.

---

## 4. Risk register (top)
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Users churn after week 1 (category norm) | High | High | Plan-diff check-in reward, 3/5/10-min flexibility, reminders after first ritual, honest expectations copy |
| Store rejects health-adjacent claims | Medium | High | Evidence-tier language enforced in copy review; legal review at M5 |
| Trust damaged by any billing ambiguity | Medium | Very High | No weekly plan, no dark patterns, visible cancel, refund-honor policy |
| Rules engine bug allows contraindicated content | Low | Very High | Self-test per rule in M1; engine is the single gate; content carries contraindication codes |
| Scope creep into skin-CV too early | Medium | Medium | M6 gate; founder decision required |
| PWA→Flutter port friction | Medium | Low | Content/rules/contracts designed portable from day one |

## 5. M1 dev strategy
- Orchestrated multi-agent build (design → scaffold → 4 parallel feature agents → merge/build gate), React 19 + TS + Vite + Tailwind + framer-motion, localStorage persistence with the spec's entity names, rules engine as pure TS module + self-tests.
- Living docs maintained in-repo: ROADMAP.md, ARCHITECTURE.md, TODO (below), known limitations.

## 6. Current TODO / blockers / debt (living)
- **Blockers:** none for M1. Native toolchain absence is a documented constraint, not a blocker.
- **Tech debt accepted in M1:** simulated purchases (flagged in UI), local-only data, demo coach.
- **Known issues:** none yet — will log post-build.
- **Next decision for CEO:** platform path confirmation (§2) + M2 backend vendor (Supabase vs Firebase) when we get there.

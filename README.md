# LumaFace — AI Facial Care Coach

A trust-first, monetized facial-care coach for adult women: personalized skincare education, gentle facial movement, massage, posture, consent-based progress photos, and a safety-constrained coach. **Milestone 1 = installable mobile PWA** (Android + iOS home screens), Capacitor-ready for the stores.

## Status: M1 complete (2026-07-17)
- 14 routes, 24-activity evidence-tiered content library (8 free), deterministic safety rules engine `2026.07.1` (8 SAFE-* rules), 28-day adaptive program, weekly check-ins with visible plan adjustments, on-device photo diary, bounded coach preview, store-compliant simulated paywall ($9.99/mo · $49.99/yr + 7-day trial).
- **85/85 tests green · clean production build · verifier v4: 25/25 pass.**

## Run
```bash
npm install
npm run dev      # local dev
npm run build    # production build → dist/
npm run test     # vitest suite (rules engine, smoke, feature tests)
```

## Architecture (M1)
React 19 + TS + Vite 7 + Tailwind 3.4 + framer-motion. All data on-device (localStorage `lf_*`) — zero backend, zero uploads.
- `src/lib/rules.ts` — deterministic safety/plan authority (the ONLY gate; versioned)
- `src/lib/plan.ts` — 28-day plan builder + post-check-in adjustment (PlanDiff)
- `src/lib/store.tsx` — AppProvider/useApp: profile, safety, plan, progress, check-ins, consents, photos, pro, coach threads
- `src/data/` — activities (Appendix-A records), program, content (sources registry R7/R18/R26…)
- `src/pages/` — onboarding, today, routine, library, activity (detail/session/done), program, check-in, progress, coach, paywall, profile, help

## Docs
- `docs/CTO-REVIEW.md` — spec review, risks, milestone roadmap M1–M6
- `docs/ARCHITECTURE.md` · `docs/STORE-PATH.md` (Capacitor wrap) · `docs/DECISIONS.md` · `docs/KNOWN-ISSUES.md`

## Non-negotiables
No beauty scoring, no diagnosis, no permanent-reshaping claims (evidence tiers A/B/C govern all copy) · safety content never paywalled · photos never leave the device · no weekly plan, no dark patterns.

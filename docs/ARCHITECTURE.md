# Architecture — LumaFace M1

## Principles
1. **Rules engine is the authority.** UI never decides safety; `evaluateSafety()` (pure, versioned `2026.07.1`) gates onboarding → plan → activity start → check-in adjustments → coach answers. One module, one test per rule.
2. **On-device-first.** Zero network calls with user data in M1; photos are localStorage data-URLs (≤720px), export/delete are user-controlled. The M2 backend must preserve this default (sync = opt-in consent).
3. **Portability.** Content records follow spec Appendix A byte-for-byte → direct Firestore import later. Rules engine is framework-free → runs in Cloud Functions/Edge unchanged. Coach contract mirrors spec §4.3 → UI unchanged when the real gateway ships.
4. **Design system single-source.** Tokens in `src/lib/theme.ts` + Tailwind theme; 6 category tints; tier colors; motion easings; RTL-ready logical CSS.

## Data flow
onboarding answers → `evaluateSafety` → `buildPlan` → store (`lf_*`) → Today/Routine/Program render plan → `logSession` → progress/streaks/badges → weekly `saveCheckIn` → `adjustPlanAfterCheckIn` → PlanDiffCard.

## Known seams for M2+
- Entitlement: `pro` flag is local; M2 moves source-of-truth server-side (RevenueCat webhook).
- Auth/sync: store keys map 1:1 to spec §9 entities for migration.
- Camera: capture is file-input; MediaPipe live coaching slots into ActivitySession's camera strip.
- Coach: `src/pages/coach/engine.ts` (local retrieval) is replaced by the M4 gateway client; response shape frozen by tests.

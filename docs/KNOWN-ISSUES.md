# Known issues & accepted debt (M1 — living)
- Purchases/restore are simulated (labeled "Demo build") — real IAP in M2.
- Coach is a labeled local-retrieval Preview; `coachChat` consent does not yet gate local thread persistence (data never leaves device; tighten in M2).
- `lf_onboarding_draft` is outside store.ALL_KEYS (unreachable post-onboarding; harmless) — fold into delete-all sweep in M2.
- Reduced-motion Profile toggle works at CSS layer; framer-motion follows OS pref only (wire into MotionConfig in M2).
- ~~Bundle is a single chunk~~ — resolved: route-level React.lazy + vendor splitting (react/motion/supabase); entry is now ~379 kB (115 kB gzip) with per-route chunks of 2–55 kB.
- Reminder/sound/haptic prefs are stored but inert (need native shell).
- Queue mode (multi-activity sessions) implemented in player but has no caller yet.
- Old coach threads persist but aren't browsable UI-wise.

## M2 additions
- Stripe/APP_BASE_URL secrets pending (CEO dashboard task) — billing runs in "opening soon" mode until configured.
- ~~Account deletion removes all user rows via RLS but the auth.users record itself remains~~ — resolved: the `delete-account` Edge Function now deletes the auth user (CASCADE removes all rows); honest failure toasts when unreachable.
- Apple/Google OAuth not configured (needs CEO store/dev accounts); email-only auth for pilot.
- Sync conflicts use last-write-wins per entity; multi-device simultaneous edits of the same plan day can clobber (acceptable at pilot scale).
- package-lock.json intentionally not pushed to GitHub (regenerable); npm install required after clone.

## M3 additions
- ~~Storage quota failures not surfaced (localStorage try/catch only logged)~~ — resolved: failed saves now surface a dismissible in-app warning banner (persistence.test.tsx).
- Capture-quality thresholds (lighting/blur/framing) are conservative estimates — need real-device calibration on iPhone Safari/PWA + mid-range Android.
- Camera permission-denial and interrupted-capture flows need real-device QA.
- IndexedDB photo store needs native filesystem adaptation when packaging with Capacitor.

## M4 additions
- Coach gateway (`coach-chat` edge function + `coach_usage` table) is deployed and consent-gated; it returns `unconfigured` until AI_API_KEY/AI_MODEL/AI_BASE_URL secrets are set (CEO decision: provider). Until then the client keeps its labeled local preview — no faked AI.

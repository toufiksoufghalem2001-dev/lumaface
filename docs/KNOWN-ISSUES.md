# Known issues & accepted debt (M1 — living)
- Purchases/restore are simulated (labeled "Demo build") — real IAP in M2.
- Coach is a labeled local-retrieval Preview; `coachChat` consent does not yet gate local thread persistence (data never leaves device; tighten in M2).
- `lf_onboarding_draft` is outside store.ALL_KEYS (unreachable post-onboarding; harmless) — fold into delete-all sweep in M2.
- Reduced-motion Profile toggle works at CSS layer; framer-motion follows OS pref only (wire into MotionConfig in M2).
- Bundle is a single ~523 kB chunk (163 kB gzip) — route-level React.lazy in M2.
- Reminder/sound/haptic prefs are stored but inert (need native shell).
- Queue mode (multi-activity sessions) implemented in player but has no caller yet.
- Old coach threads persist but aren't browsable UI-wise.

## M2 additions
- Stripe/APP_BASE_URL secrets pending (CEO dashboard task) — billing runs in "opening soon" mode until configured.
- Account deletion removes all user rows via RLS but the auth.users record itself remains (needs a service-side delete function or dashboard action — M3).
- Apple/Google OAuth not configured (needs CEO store/dev accounts); email-only auth for pilot.
- Sync conflicts use last-write-wins per entity; multi-device simultaneous edits of the same plan day can clobber (acceptable at pilot scale).
- package-lock.json intentionally not pushed to GitHub (regenerable); npm install required after clone.

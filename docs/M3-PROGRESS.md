# Milestone 3 — Camera v1 progress

## Implemented in this continuation
- Honest on-device capture-condition gate for lighting, focus and framing.
- No facial appearance, attractiveness, age, skin, symmetry or beauty analysis.
- Failed quality gate asks for a retake but preserves user control with “Save anyway”.
- Removed the previous pseudo-random framing score; framing is now a deterministic portrait/square suitability check.
- Comparison remains abstention-first when lighting or focus conditions are not sufficiently similar.
- Added focused unit tests for pass, retry, overexposure and comparison abstention cases.

## Still required for M3 exit
- Real-device calibration on low- and mid-range Android plus iPhone Safari/PWA.
- Camera permission-denial and interrupted-capture QA.
- Storage quota handling and IndexedDB/native-file migration.
- Capture-quality threshold tuning from a consented test set representing varied lighting conditions and skin tones.
- Service-side auth-user deletion function from the M2 known-issues list.

## Added in the storage-hardening pass
- Progress photos now persist in IndexedDB rather than synchronous localStorage.
- Existing `lf_photos` data migrates automatically once and the legacy key is removed.
- Failed photo writes roll back the in-memory capture instead of pretending it was saved.
- Delete-all now clears IndexedDB photos plus onboarding/check-in drafts.
- Data export continues to include local-only photos explicitly.
- Removed one duplicate inventory sync enqueue.

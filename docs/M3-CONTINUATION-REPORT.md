# LumaFace Milestone 3 — continuation report

## Delivered
- Added deterministic, on-device capture-condition checks for lighting, focus and framing.
- Added retake guidance with an explicit **Save anyway** choice.
- Added comparison abstention when two captures are not photographically comparable.
- Replaced photo persistence in `localStorage` with local-only IndexedDB storage.
- Added automatic one-time migration of legacy `lf_photos` data.
- Added rollback when a photo cannot be persisted, instead of showing a false successful save.
- Extended data deletion to clear photos, onboarding drafts, check-in drafts and sync state.
- Preserved photos in explicit user data exports.
- Removed a duplicate inventory sync enqueue.

## Privacy boundary
No facial appearance, attractiveness, age, skin, symmetry or beauty scoring was added. Photos remain local-only; only non-image capture metadata can enter the existing consent-gated sync system.

## Verification status
The source tree was inspected after the changes. A complete build/test verification could not be completed in this environment because the supplied archive contains an incomplete `node_modules` directory and package installation was unavailable. Run the following in a normal development environment before merging:

```bash
npm ci
npm test
npm run lint
npm run build
```

## Remaining M3 exit work
- Real-device threshold calibration on iPhone Safari/PWA and representative Android devices.
- Permission-denial and interrupted-capture QA.
- User-visible handling for storage quota failures.
- Native filesystem adaptation when packaging with Capacitor.
- Authenticated account-deletion edge function from the M2 gate.

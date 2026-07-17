# Path to App Store & Google Play (from this M1 PWA)

## Option A — Capacitor wrapper (fast, decided fallback)
```bash
npm i @capacitor/core @capacitor/cli && npx cap init   # capacitor.config.json already present
npm run build && npx cap add ios && npx cap add android
npx cap sync
# iOS: open ios/App/App.xcodeproj in Xcode (macOS), set team, archive
# Android: open android/ in Android Studio, generate signed bundle
```
In-app purchases via RevenueCat Capacitor plugin; keep paywall UX (already store-compliant).

## Option B — Flutter native rebuild (spec §8.1 end-state, M5 decision gate)
Port order: 1) rules engine (Dart, from rules.ts — tests port 1:1) 2) content JSON import 3) screens from design/ docs 4) MediaPipe camera 5) RevenueCat. PWA remains the web product.

## Store checklist (M5)
- Metadata claims review (evidence-tier language only; no medical/beauty-transformation claims; distance from looksmaxxing trends)
- Apple: privacy nutrition labels (data NOT collected — M1 default), IAP for digital content, 1.4.1 health-claims review
- Google: Data Safety form, Health apps declaration, subscription terms on paywall (already present)
- Age rating questionnaire (18+ content gate exists)

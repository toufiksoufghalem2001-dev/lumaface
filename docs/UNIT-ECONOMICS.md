# Unit Economics — LumaFace (living model, v1 · 2026-07-18)
All figures are planning assumptions grounded in M0 research; update with real pilot data. Sources: RevenueCat State of Subscription Apps benchmarks cited in `research/monetization.md`, vendor pricing pages (Supabase/Stripe/RevenueCat, July 2026).

## 1. Prices & take-rates
| Channel | Price | Platform cost | Our share |
|---|---|---|---|
| Stripe web (pilot) | $9.99/mo · $49.99/yr (7-day trial) | ~2.9% + $0.30/txn (+0.5% Billing) | $9.40 / $48.24 |
| App Store IAP (M5+) | same | 15% (Small Business Program, <$1M) + RC ~1% | ~$8.39 / $41.99 |
| Google Play IAP (M5+) | same | 15% + RC ~1% | ~$8.39 / $41.99 |

## 2. Conversion assumptions (category benchmarks)
- Onboarding → trial start (soft paywall, card-required trial): **3–8%** of installs (indie median ~5%)
- Trial → paid: **35–50%** (card-required median ~48.8%)
- Blended install → paid: **1.5–3%**
- Monthly churn: **6–10%** mo-1 heavy, settling to **4–6%** by mo-3; annual churn at renewal ~40–60% (category norm)

## 3. Scenario table (per 1,000 installs)
| | Pessimistic | Base | Optimistic |
|---|---|---|---|
| Trial starts (5%/6.5%/8%) | 50 | 65 | 80 |
| Paid subs (35%/45%/50% trial→paid) | 18 | 29 | 40 |
| Mix (monthly:annual 60:40) | 11 mo + 7 yr | 17 mo + 12 yr | 24 mo + 16 yr |
| Month-1 gross (Stripe) | 11×9.40 + 7×48.24 = **$441** | 17×9.40 + 12×48.24 = **$739** | 24×9.40 + 16×48.24 = **$997** |
| Month-1 infra (Supabase Free $0 + email) | ~$0 | ~$0 | ~$0 |

## 4. LTV model (Stripe share, gross)
- Monthly sub: $9.40/mo × avg lifetime (1/churn): churn 8% → 12.5 mo → **$117** ; churn 5% → 20 mo → **$188**
- Annual sub: $48.24 yr-1; renewal at 50% → yr-1+0.5×yr-2 ≈ **$72** over 2 yrs
- Blended LTV (60:40): **~$99–146**
- **CAC ceiling: LTV/3 ≈ $33–48.** Organic/ASO/TikTok content must carry us below that; no paid UA until pilot proves retention.

## 5. Fixed costs timeline
| Phase | Monthly cost |
|---|---|
| M2 build (now) | **$0** (Supabase Free, Stripe pay-per-txn) |
| Pilot public | **$25** (Supabase Pro) + domain ~$1 |
| M5 native | + $99/yr Apple + $25 Google + RevenueCat $0 (<$2.5k MTR) |
| 1K paying users | ~$25–75 Supabase + ~1% RC (if IAP) |

## 6. Pilot kill/scale criteria (30-user paid pilot)
**Scale if:** ≥30 paid in 60 days organically · ≥40% complete 4+ sessions/wk · monthly churn <8% · refunds <5% · support tickets <10%/user/mo.
**Iterate if:** paid but churn 8–12% → retention work before M3.
**Kill/pivot if:** <10 paid at 60 days or refunds >10% → revisit positioning (research says trust wedge is real; execution would be the suspect).

## 7. Sensitivity (what moves the needle most)
1. Trial→paid conversion (trial reminders + plan-diff check-ins) — ±10pp = ±$200/1K installs mo-1
2. Annual mix share (annual hero default already; post-trial upgrade prompts) — +10pp annual = +$110/1K
3. Churn (3/5/10-min flexibility, reminders, honest expectations) — −2pp monthly churn ≈ +$25 LTV
4. Install→trial (paywall timing, free-tier quality) — research: useful free tier lifts long-run conversion despite fewer day-0 trials

## 8. Open questions for pilot instrumentation
- Where do installs come from? (need UTM discipline + share card tracking)
- Does the coach preview move conversion? (A/B: paywall after coach vs after plan reveal — M3 experiment)
- Web checkout completion rate (Stripe-hosted page) vs store IAP norm (~65% vs ~75%)

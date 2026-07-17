/**
 * LumaFace static content — tips, badges, quotes, goals, safety questions,
 * inventory options, and the SOURCES registry.
 * Copy follows design.md §9 voice rules and home.md/onboarding.md content.
 */

/* ── Daily tips (home.md §5 — 8 evidence-honest tips) ─────────────────── */

export interface Tip {
  id: string;
  body: string;
  /** optional tier callout shown on the expanded sheet */
  tier?: 'A' | 'B' | 'C';
  expanded: string;
}

export const TIPS: Tip[] = [
  {
    id: 'tip-sunscreen',
    body: 'Sunscreen is the single best-supported step for healthy-looking skin — every morning, rain or shine. (Tier A)',
    tier: 'A',
    expanded: 'Broad-spectrum SPF 30+ every morning is the most consistently supported habit in dermatology guidance. It helps protect against UV-related visible aging — it does not reverse existing conditions.',
  },
  {
    id: 'tip-one-active',
    body: "Introduce new actives one at a time — your skin can't tell you which of three new things stings.",
    expanded: 'One active, patch-tested on the jawline, waited out for 24 hours. That way any reaction has exactly one suspect — and your skin gets time to adapt.',
  },
  {
    id: 'tip-massage-honest',
    body: 'Massage may temporarily ease the look of morning puffiness. Think minutes, not miracles. (Tier B)',
    tier: 'B',
    expanded: 'Gentle massage can support relaxation and may temporarily change the appearance of puffiness. Any effect is short-lived and varies from person to person — no structural change is promised.',
  },
  {
    id: 'tip-movement-honest',
    body: 'Face movement is experimental — enjoy it as relaxation, not renovation. (Tier C)',
    tier: 'C',
    expanded: 'Evidence for facial exercise is preliminary and limited. We include it as gentle awareness practice — with no promised reshaping, ever.',
  },
  {
    id: 'tip-patch-test',
    body: 'Patch-test on the jawline and wait 24 hours before a new active touches your whole face.',
    expanded: 'A small patch on the jawline tells you far more than a full-face gamble. 24 quiet hours first is the cautious, dermatologist-consistent path.',
  },
  {
    id: 'tip-burning',
    body: "Burning is not 'working'. Comfortable skin learns to trust your routine.",
    expanded: 'Stinging and burning are signals, not progress. If something repeatedly stings, stop that product — not the habit — and consider a Barrier Reset week.',
  },
  {
    id: 'tip-retinoid-pregnancy',
    body: 'Retinoid and expecting (or trying)? Pause it and chat with your clinician — your plan already has.',
    expanded: 'Pregnancy and retinoids do not mix. LumaFace pauses retinoid education the moment you tell us, and your clinician should confirm everything else on your shelf.',
  },
  {
    id: 'tip-photos',
    body: 'For comparable photos: same window, same distance, relaxed face. Or skip photos entirely — habits count too.',
    expanded: 'A photo only means something when conditions match. Same light, same distance, relaxed face — otherwise the app says so honestly and skips the comparison.',
  },
];

/* ── Badges (design.md §7.7 — habits and care, never appearance) ──────── */

export interface BadgeDef {
  id: string;
  name: string;
  /** lucide icon key — rendered by BadgeCard */
  icon: 'Sunrise' | 'Flame' | 'Gem' | 'Flower2' | 'Award' | 'Sun';
  criteria: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-light', name: 'First Light', icon: 'Sunrise', criteria: 'Complete your first session' },
  { id: 'three-day-rhythm', name: 'Three-Day Rhythm', icon: 'Flame', criteria: 'Keep a 3-day streak' },
  { id: 'diamond-week', name: 'Diamond Week', icon: 'Gem', criteria: 'Keep a 7-day streak' },
  { id: 'full-circle', name: 'Full Circle', icon: 'Flower2', criteria: 'Complete all 28 program days' },
  { id: 'century-of-care', name: 'Century of Care', icon: 'Award', criteria: 'Complete 100 sessions' },
  { id: 'early-ritual', name: 'Early Ritual', icon: 'Sun', criteria: 'Complete 5 sessions before 9am' },
];

/* ── Quotes (home.md §2 pool + §9 daily quote) ─────────────────────────── */

export const QUOTES = {
  /** greeting poetic line — rotates daily */
  greetingPool: [
    'Care is a habit, not a hurry.',
    'A few quiet minutes belong to you.',
    'Gentle is still powerful.',
    'Your skin likes consistency more than perfection.',
    'Today, be on your own side.',
  ],
  /** home §9 daily quote */
  daily: 'We don’t chase perfection — we practice care, and let the rest take its time.',
  dailyAttribution: '— LumaFace journal',
} as const;

/* ── Goals (spec §4.1 / onboarding.md Step 1 — 9 goals, max 3) ─────────── */

export interface GoalDef {
  id: string;
  name: string;
  /** lucide icon key rendered by the onboarding goal card */
  icon: 'Sparkles' | 'Droplets' | 'Sun' | 'CircleDot' | 'Palette' | 'Feather' | 'Waves' | 'CloudSun' | 'CalendarHeart';
  descriptor: string;
}

export const GOALS: GoalDef[] = [
  { id: 'healthy-skin', name: 'Healthy-looking skin', icon: 'Sparkles', descriptor: 'A simple routine that supports your skin barrier' },
  { id: 'dryness-comfort', name: 'Dryness & comfort', icon: 'Droplets', descriptor: 'Less tightness, more ease' },
  { id: 'shine', name: 'Shine', icon: 'Sun', descriptor: 'Understanding and balancing midday shine' },
  { id: 'blemishes', name: 'Visible blemishes', icon: 'CircleDot', descriptor: "Gentle care that doesn't pick or strip" },
  { id: 'uneven-tone', name: 'Uneven-looking tone', icon: 'Palette', descriptor: 'Daily protection and patient, even-looking care' },
  { id: 'fine-lines', name: 'Fine-line care', icon: 'Feather', descriptor: 'Kind, realistic care for lines that tell stories' },
  { id: 'puffiness', name: 'Morning puffiness', icon: 'Waves', descriptor: 'Gentle moves that may temporarily de-puff' },
  { id: 'tension', name: 'Jaw & forehead tension', icon: 'CloudSun', descriptor: 'Unclench the stress you carry in your face' },
  { id: 'consistency', name: 'Routine consistency', icon: 'CalendarHeart', descriptor: 'A ritual small enough to keep every day' },
];

/* ── Safety questions (spec §4.1 Safety / onboarding.md Step 2 — 7 rows) ── */

export interface SafetyQuestionDef {
  /** key of SafetyAnswers in lib/rules.ts */
  key: 'allergies' | 'sensitiveSkin' | 'pregnantOrTrying' | 'recentProcedure' | 'facialPainOrNerve' | 'openWoundOrInfection' | 'eyeSymptoms';
  title: string;
  helper: string;
  /** soft inline note shown when toggled on (null = no note) */
  onNote: string | null;
}

export const SAFETY_QUESTIONS: SafetyQuestionDef[] = [
  { key: 'allergies', title: 'Known allergies', helper: 'Skincare or cosmetic ingredients that bother your skin', onNote: null },
  { key: 'sensitiveSkin', title: 'Sensitive skin', helper: 'Products often sting, burn or flush your skin', onNote: null },
  { key: 'pregnantOrTrying', title: 'Pregnant or trying', helper: "We'll keep ingredient guidance pregnancy-safe", onNote: "We'll pause retinoid education and keep everything pregnancy-considerate. 💛" },
  { key: 'recentProcedure', title: 'Recent procedure or injectables', helper: 'Fillers, Botox, peels, or facial surgery in the last few months', onNote: 'Massage and movement wait until your practitioner says go — skincare stays.' },
  { key: 'facialPainOrNerve', title: 'Facial pain or nerve condition', helper: 'Including jaw (TMJ) pain, or a history of facial nerve issues', onNote: "Jaw work becomes relaxation-only, and we'll be extra gentle." },
  { key: 'openWoundOrInfection', title: 'Open wound or infection', helper: 'Anything healing, broken, or infected on your face right now', onNote: null },
  { key: 'eyeSymptoms', title: 'Eye symptoms', helper: 'Eye pain, vision changes, or a recent eye injury', onNote: "Eye-area activities will stay off your plan, and we'll suggest professional guidance." },
];

/* ── Inventory options (onboarding.md Step 3) ──────────────────────────── */

export interface InventoryOptionDef {
  /** product id stored in Inventory.products */
  id: 'cleanser' | 'moisturizer' | 'sunscreen' | 'retinoid' | 'acids' | 'benzoyl-peroxide' | 'fragranced' | 'makeup';
  label: string;
}

export const INVENTORY_OPTIONS: InventoryOptionDef[] = [
  { id: 'cleanser', label: 'Cleanser' },
  { id: 'moisturizer', label: 'Moisturizer' },
  { id: 'sunscreen', label: 'Sunscreen' },
  { id: 'retinoid', label: 'Retinoid/retinol' },
  { id: 'acids', label: 'Exfoliating acids (AHA/BHA)' },
  { id: 'benzoyl-peroxide', label: 'Benzoyl peroxide' },
  { id: 'fragranced', label: 'Fragranced products' },
  { id: 'makeup', label: 'Makeup most days' },
];

/** "Your skin's history with new products" — single-select (onboarding Step 3B). */
export const REACT_HISTORY_OPTIONS = [
  { id: 'usually-fine', label: 'Usually fine' },
  { id: 'sometimes-reacts', label: 'Sometimes reacts' },
  { id: 'often-reacts', label: 'Often reacts' },
] as const;

/* ── SOURCES registry (spec reference list + LumaFace content notes) ───── */

export interface SourceDef {
  id: string;
  publisher: string;
  title: string;
  url?: string;
}

export const SOURCES: Record<string, SourceDef> = {
  R6: { id: 'R6', publisher: 'Van Borsel et al.', title: 'The effectiveness of facial exercises for facial rejuvenation (systematic review)', url: 'https://pubmed.ncbi.nlm.nih.gov/24327764/' },
  R7: { id: 'R7', publisher: 'American Academy of Dermatology', title: 'Dermatologist-recommended skin care for your 20s', url: 'https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s' },
  R14: { id: 'R14', publisher: 'Levrini et al.', title: 'Myofunctional speech therapy for facial rejuvenation: systematic review', url: 'https://pubmed.ncbi.nlm.nih.gov/38921635/' },
  R15: { id: 'R15', publisher: 'Seraj et al.', title: 'Efficacy of conservative techniques for mechanical facial rejuvenation (2025)', url: 'https://pubmed.ncbi.nlm.nih.gov/41322034/' },
  R16: { id: 'R16', publisher: 'De Vos et al.', title: 'Facial exercises for facial rejuvenation: control group study', url: 'https://pubmed.ncbi.nlm.nih.gov/24296342/' },
  R18: { id: 'R18', publisher: 'American Academy of Dermatology', title: 'Retinoid or retinol?', url: 'https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol' },
  R26: { id: 'R26', publisher: 'American Academy of Dermatology', title: 'Basic skin care', url: 'https://www.aad.org/public/everyday-care/skin-care-basics/care' },
  R32: { id: 'R32', publisher: 'American Academy of Dermatology', title: 'Acne diagnosis and treatment', url: 'https://www.aad.org/public/diseases/acne/derm-treat/treat' },
  R33: { id: 'R33', publisher: 'American Academy of Dermatology', title: 'Skin care in your 40s and 50s', url: 'https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-40s-and-50s' },
  R39: { id: 'R39', publisher: 'American Academy of Dermatology', title: 'Dermatologist guide to skincare', url: 'https://www.aad.org/news/dermatologist-guide-skincare' },
  R40: { id: 'R40', publisher: 'American Academy of Dermatology', title: 'Acne Resource Center', url: 'https://www.aad.org/public/diseases/acne' },
  'CONTENT-011': { id: 'CONTENT-011', publisher: 'LumaFace library', title: 'Expert-authored practice note — gentle facial massage sequence' },
  'CONTENT-014': { id: 'CONTENT-014', publisher: 'LumaFace library', title: 'Expert-authored practice note — morning de-puff glide' },
  'CONTENT-017': { id: 'CONTENT-017', publisher: 'LumaFace library', title: 'Expert-authored practice note — gentle gua sha, light pressure only' },
  'CONTENT-022': { id: 'CONTENT-022', publisher: 'LumaFace library', title: 'Expert-authored practice note — cheek air transfer' },
  'CONTENT-023': { id: 'CONTENT-023', publisher: 'LumaFace library', title: 'Expert-authored practice note — controlled oo–ee' },
  'CONTENT-024': { id: 'CONTENT-024', publisher: 'LumaFace library', title: 'Expert-authored practice note — controlled jaw opening' },
  'CONTENT-031': { id: 'CONTENT-031', publisher: 'LumaFace library', title: 'Expert-authored practice note — soft-eye relaxation (palming)' },
  'CONTENT-032': { id: 'CONTENT-032', publisher: 'LumaFace library', title: 'Expert-authored practice note — brow-tension awareness' },
  'CONTENT-033': { id: 'CONTENT-033', publisher: 'LumaFace library', title: 'Expert-authored practice note — temple relaxation' },
  'CONTENT-034': { id: 'CONTENT-034', publisher: 'LumaFace library', title: 'Expert-authored practice note — cool compress de-puff' },
  'CONTENT-041': { id: 'CONTENT-041', publisher: 'LumaFace library', title: 'Expert-authored practice note — shoulder reset' },
  'CONTENT-042': { id: 'CONTENT-042', publisher: 'LumaFace library', title: 'Expert-authored practice note — side-neck stretch' },
  'CONTENT-043': { id: 'CONTENT-043', publisher: 'LumaFace library', title: 'Expert-authored practice note — chin retraction' },
  'CONTENT-051': { id: 'CONTENT-051', publisher: 'LumaFace library', title: 'Expert-authored practice note — neutral jaw rest' },
  'CONTENT-052': { id: 'CONTENT-052', publisher: 'LumaFace library', title: 'Expert-authored practice note — smile release' },
  'CONTENT-053': { id: 'CONTENT-053', publisher: 'LumaFace library', title: 'Expert-authored practice note — lower-face release' },
};

/** Canonical disclaimer copy (design.md §7.9 — reuse verbatim). */
export const DISCLAIMER_FULL =
  'LumaFace is a cosmetic wellness and education app — it is not medical advice and is not intended to diagnose, treat, cure, or prevent any disease. LumaFace never scores or judges your appearance. Skincare basics follow established dermatologist guidance; facial massage and gentle face movement have limited or preliminary evidence, and any effects are generally temporary and vary from person to person. If you are pregnant or trying to become pregnant, have a skin, eye, or facial nerve condition, or have recently had a procedure or injectables, please check with a qualified professional first.';

/** AI disclosure (design.md §12). */
export const AI_DISCLOSURE =
  'The LumaFace coach answers from an expert-approved content library. It cannot diagnose conditions, and in this preview build it does not generate open-ended medical answers.';

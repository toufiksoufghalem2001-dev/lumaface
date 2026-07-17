/**
 * LumaFace code-drawn SVG illustrations (design.md §11).
 *
 * Style contract for every Face* illustration: flat fills, category `hue`
 * arch-tile background, 200×200 viewBox, 3px ink strokes, serene expressions,
 * blush rgba(168,70,90,.18), diverse skin tones + hair (bob, bun, waves,
 * silver, curls, head wrap, hijab), hands as flat rounded shapes, curved
 * direction arrows — NO red/defect marks, ever.
 */

import type { ReactNode } from 'react';
import { COLORS, ILLO_BLUSH } from '@/lib/theme';

/* ── Shared palette ────────────────────────────────────────────────────── */

const INK = COLORS.ink;
const SKIN = {
  light: '#F3D4BE',
  lightMed: '#E9BFA0',
  medium: '#D89B74',
  warmMed: '#C08457',
  deep: '#9A6642',
  deepRich: '#7A4E31',
} as const;
const HAIR = {
  chestnut: '#6B4226',
  black: '#2A2320',
  blonde: '#D9B98A',
  silver: '#C9C2BC',
  auburn: '#8A4A32',
  dark: '#3D2B22',
} as const;
const CLOTH = '#EFE7DA';

/* ── Small primitives ──────────────────────────────────────────────────── */

/** Shared arrowhead marker (ink). Included in every Face svg — identical
 *  definitions, so duplicate ids resolve harmlessly. */
function ArrowDefs() {
  return (
    <defs>
      <marker id="lf-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={INK} />
      </marker>
    </defs>
  );
}

/** Curved direction arrow (ink, rounded). */
function Arrow({ d, w = 2.5 }: { d: string; w?: number }) {
  return <path d={d} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" markerEnd="url(#lf-arr)" />;
}

/** Flat rounded hand shape (palm + finger bumps). */
function Hand({ x, y, r = 0, flip = false, tone }: { x: number; y: number; r?: number; flip?: boolean; tone: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})${flip ? ' scale(-1 1)' : ''}`}>
      <rect x="-15" y="-6" width="30" height="34" rx="13" fill={tone} />
      <circle cx="-9" cy="-8" r="5.5" fill={tone} />
      <circle cx="0" cy="-11" r="5.5" fill={tone} />
      <circle cx="9" cy="-8" r="5.5" fill={tone} />
    </g>
  );
}

function Droplet({ x, y, s = 1, fill = '#7FB0D9' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      d={`M ${x} ${y - 6 * s} C ${x - 4 * s} ${y} ${x - 4 * s} ${y + 4 * s} ${x} ${y + 5 * s} C ${x + 4 * s} ${y + 4 * s} ${x + 4 * s} ${y} ${x} ${y - 6 * s} Z`}
      fill={fill}
      opacity={0.85}
    />
  );
}

function SunGlyph({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#D9A441" strokeWidth={2} strokeLinecap="round" fill="none">
      <circle r="5" fill="#EBBE6A" stroke="none" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="8" y1="0" x2="11" y2="0" transform={`rotate(${a})`} />
      ))}
    </g>
  );
}

function MoonGlyph({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path d={`M ${x} ${y - 7 * s} a ${7 * s} ${7 * s} 0 1 0 ${5 * s} ${12 * s} a ${5.6 * s} ${5.6 * s} 0 1 1 ${-5 * s} ${-12 * s} Z`} fill="#BFA8CE" />;
}

/** Tiny "melting" wavy lines. */
function WaveLines({ x, y, color = INK, n = 3 }: { x: number; y: number; color?: string; n?: number }) {
  return (
    <g stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.55}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M ${x} ${y + i * 7} q 4 3 8 0 q 4 -3 8 0`} />
      ))}
    </g>
  );
}

/* ── FaceBase ──────────────────────────────────────────────────────────── */

type HairVariant = 'bob' | 'bun' | 'waves' | 'curls' | 'wrap' | 'hijab' | 'ponytail' | 'short' | 'streak-bun';
type Eyes = 'closed' | 'open';
type Mouth = 'soft' | 'smile' | 'neutral' | 'oo' | 'ah';

interface FaceBaseProps {
  bg: string;
  skin: string;
  hair: HairVariant;
  hairColor: string;
  eyes?: Eyes;
  mouth?: Mouth;
  alt: string;
  className?: string;
  children?: ReactNode;
}

function HairBack({ variant, color }: { variant: HairVariant; color: string }) {
  switch (variant) {
    case 'bob':
      return <ellipse cx="100" cy="102" rx="52" ry="58" fill={color} />;
    case 'bun':
    case 'streak-bun':
      return (
        <g>
          <circle cx="100" cy="42" r="17" fill={color} />
          <ellipse cx="100" cy="96" rx="49" ry="54" fill={color} />
        </g>
      );
    case 'waves':
      return (
        <g fill={color}>
          <ellipse cx="100" cy="102" rx="51" ry="57" />
          <circle cx="55" cy="132" r="13" />
          <circle cx="145" cy="132" r="13" />
        </g>
      );
    case 'curls':
      return (
        <g fill={color}>
          {[
            [62, 66], [84, 48], [108, 44], [130, 54], [144, 76],
            [52, 92], [148, 100], [56, 118], [144, 124], [70, 140], [130, 142],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="13" />
          ))}
          <ellipse cx="100" cy="98" rx="46" ry="50" />
        </g>
      );
    case 'wrap':
      return (
        <g fill={color}>
          <path d="M100 38 q-50 0 -50 54 q0 12 5 20 q45 -20 90 0 q5 -8 5 -20 q0 -54 -50 -54 Z" />
          <circle cx="128" cy="50" r="11" />
        </g>
      );
    case 'hijab':
      return <path d="M100 36 q-55 0 -55 62 q0 42 17 64 q9 7 11 -5 q-7 -25 -7 -41 q0 -48 34 -48 q34 0 34 48 q0 16 -7 41 q2 12 11 5 q17 -22 17 -64 q0 -62 -55 -62 Z" fill={color} />;
    case 'ponytail':
      return (
        <g fill={color}>
          <ellipse cx="100" cy="96" rx="49" ry="54" />
          <path d="M140 76 q28 12 23 48 q-3 18 -14 20 q7 -24 -2 -42 q-6 -14 -7 -26 Z" />
        </g>
      );
    case 'short':
      return <ellipse cx="100" cy="88" rx="46" ry="42" fill={color} />;
  }
}

function HairFront({ variant, color }: { variant: HairVariant; color: string }) {
  if (variant === 'hijab') {
    return <path d="M63 88 q37 -30 74 0 q-4 -26 -37 -28 q-33 2 -37 28 Z" fill={color} opacity={0.92} />;
  }
  if (variant === 'wrap') {
    return <path d="M60 92 q40 -26 80 0 q-2 -14 -40 -16 q-38 2 -40 16 Z" fill={color} opacity={0.95} />;
  }
  if (variant === 'curls') {
    return (
      <g fill={color}>
        {[72, 90, 108, 126].map((x, i) => (
          <circle key={i} cx={x} cy={62 + (i % 2) * 4} r="10" />
        ))}
      </g>
    );
  }
  // fringe for bob / bun / waves / ponytail / short / streak-bun
  return (
    <g>
      <path d="M61 94 q-3 -38 39 -41 q42 3 39 41 q-13 -21 -39 -21 q-26 0 -39 21 Z" fill={color} />
      {variant === 'streak-bun' && <path d="M84 56 q6 -4 12 -2 q-8 8 -10 20 q-6 2 -8 -2 q2 -10 6 -16 Z" fill={HAIR.silver} opacity={0.9} />}
    </g>
  );
}

function EyesLayer({ eyes, mouth }: { eyes: Eyes; mouth: Mouth }) {
  return (
    <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
      {/* brows */}
      <path d="M76 83 q9 -5 18 0" />
      <path d="M106 83 q9 -5 18 0" />
      {/* eyes */}
      {eyes === 'closed' ? (
        <g>
          <path d="M77 96 q8 6 16 0" />
          <path d="M107 96 q8 6 16 0" />
        </g>
      ) : (
        <g>
          <path d="M77 94 q8 5 16 0" />
          <path d="M107 94 q8 5 16 0" />
          <circle cx="85" cy="98" r="2.4" fill={INK} stroke="none" />
          <circle cx="115" cy="98" r="2.4" fill={INK} stroke="none" />
        </g>
      )}
      {/* nose */}
      <path d="M100 104 q3 8 -1 11" />
      {/* mouth */}
      {mouth === 'soft' && <path d="M92 129 q8 5 16 0" />}
      {mouth === 'neutral' && <path d="M93 129 q7 2 14 0" />}
      {mouth === 'smile' && <path d="M88 127 q12 9 24 0" />}
      {mouth === 'oo' && <ellipse cx="100" cy="130" rx="5" ry="6.5" />}
      {mouth === 'ah' && <ellipse cx="100" cy="131" rx="7" ry="9" fill="#8A4A3A" stroke="none" opacity={0.85} />}
    </g>
  );
}

/** Shared base for all Face* illustrations (§11 style contract). */
export function FaceBase({ bg, skin, hair, hairColor, eyes = 'closed', mouth = 'soft', alt, className, children }: FaceBaseProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={alt} preserveAspectRatio="xMidYMid meet">
      <ArrowDefs />
      <rect width="200" height="200" fill={bg} />
      <HairBack variant={hair} color={hairColor} />
      {/* neck + shoulders */}
      {hair !== 'hijab' && <rect x="90" y="140" width="20" height="24" rx="6" fill={skin} />}
      <path d="M38 200 q12 -36 62 -36 q50 0 62 36 Z" fill={CLOTH} />
      {/* ears + face */}
      <circle cx="61" cy="104" r="7" fill={skin} />
      <circle cx="139" cy="104" r="7" fill={skin} />
      <ellipse cx="100" cy="102" rx="40" ry="46" fill={skin} />
      <HairFront variant={hair} color={hairColor} />
      <EyesLayer eyes={eyes} mouth={mouth} />
      {/* blush */}
      <ellipse cx="74" cy="112" rx="8" ry="5" fill={ILLO_BLUSH} />
      <ellipse cx="126" cy="112" rx="8" ry="5" fill={ILLO_BLUSH} />
      {children}
    </svg>
  );
}

/* ── Brand marks & spot illustrations ──────────────────────────────────── */

/** Brand mark: three overlapping petal arcs — abstract lotus / face profile. */
export function MarkPetal({ className, color = COLORS.rose }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="LumaFace petal mark">
      <path d="M16 4 C11.8 8.4 11.8 15 16 19 C20.2 15 20.2 8.4 16 4 Z" fill={color} />
      <path d="M8.6 11.5 C7.4 17 10.6 22.4 15.8 23.6 C15.2 18.2 12.6 13.6 8.6 11.5 Z" fill={color} opacity={0.75} />
      <path d="M23.4 11.5 C24.6 17 21.4 22.4 16.2 23.6 C16.8 18.2 19.4 13.6 23.4 11.5 Z" fill={color} opacity={0.75} />
    </svg>
  );
}

/** Single petal for confetti + decorative blobs (parametric fill). */
export function Petal({ className, color = COLORS.rose }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M8 1 C3.5 5 3.5 11 8 15 C12.5 11 12.5 5 8 1 Z" fill={color} />
    </svg>
  );
}

/** Coach avatar: MarkPetal in a cream-2 circle with a violet sparkle. */
export function CoachMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label="LumaFace coach">
      <circle cx="22" cy="22" r="21" fill={COLORS.cream2} />
      <g transform="translate(11 10) scale(0.6875)">
        <path d="M16 4 C11.8 8.4 11.8 15 16 19 C20.2 15 20.2 8.4 16 4 Z" fill={COLORS.rose} />
        <path d="M8.6 11.5 C7.4 17 10.6 22.4 15.8 23.6 C15.2 18.2 12.6 13.6 8.6 11.5 Z" fill={COLORS.rose} opacity={0.75} />
        <path d="M23.4 11.5 C24.6 17 21.4 22.4 16.2 23.6 C16.8 18.2 19.4 13.6 23.4 11.5 Z" fill={COLORS.rose} opacity={0.75} />
      </g>
      <path d="M33 8 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 Z" fill={COLORS.violet} />
    </svg>
  );
}

/** Progress photo diary placeholder: two overlapping dashed arch frames +
 *  a small petal and camera glyph (ink-3 + rose). */
export function EmptyPhotos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} role="img" aria-label="Illustration: two empty photo frames waiting for your first private capture">
      <g transform="translate(34 18) rotate(-6)">
        <path d="M10 110 V50 a40 40 0 0 1 80 0 v60 Z" fill="none" stroke={COLORS.ink3} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
      </g>
      <g transform="translate(82 30) rotate(5)">
        <path d="M10 110 V50 a40 40 0 0 1 80 0 v60 Z" fill={COLORS.cream2} stroke={COLORS.ink3} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
      </g>
      <g transform="translate(118 74)" stroke={COLORS.ink3} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="-14" y="-9" width="28" height="20" rx="5" />
        <path d="M-6 -9 l2.5 -5 h7 l2.5 5" />
        <circle r="4.5" cy="1" />
      </g>
      <g transform="translate(60 118) scale(1.1)">
        <path d="M8 1 C3.5 5 3.5 11 8 15 C12.5 11 12.5 5 8 1 Z" fill={COLORS.rose} />
      </g>
    </svg>
  );
}

/* ── The 24 Face* activity illustrations (§11 manifest) ────────────────── */

import { CATEGORY_THEME } from '@/lib/theme';

const HUE = {
  skincare: CATEGORY_THEME.skincare.hue,
  massage: CATEGORY_THEME.massage.hue,
  movement: CATEGORY_THEME.movement.hue,
  eye: CATEGORY_THEME['eye-forehead'].hue,
  neck: CATEGORY_THEME['neck-posture'].hue,
  relax: CATEGORY_THEME.relaxation.hue,
} as const;

type IlloProps = { className?: string };

export function FaceCleanseAm({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.skincare} skin={SKIN.warmMed} hair="bob" hairColor={HAIR.chestnut} alt="Illustration: both hands cupping cheeks with morning water droplets" className={className}>
      <SunGlyph x={164} y={30} s={0.9} />
      <Hand x={58} y={118} r={-28} tone={SKIN.warmMed} />
      <Hand x={142} y={118} r={28} flip tone={SKIN.warmMed} />
      <Droplet x={86} y={52} s={0.8} />
      <Droplet x={102} y={44} s={0.7} />
      <Droplet x={116} y={54} s={0.8} />
    </FaceBase>
  );
}

export function FaceMoisturize({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.skincare} skin={SKIN.deep} hair="curls" hairColor={HAIR.black} alt="Illustration: fingertips smoothing cream dots across forehead and cheeks, soft outward arrows" className={className}>
      {[86, 100, 114].map((x) => (
        <circle key={x} cx={x} cy={70} r="3" fill="#FFF6E8" />
      ))}
      <circle cx="76" cy="108" r="3" fill="#FFF6E8" />
      <Hand x={56} y={120} r={-32} tone={SKIN.deep} />
      <Arrow d="M96 66 q14 -4 26 2" w={2} />
      <Arrow d="M80 106 q-10 2 -18 8" w={2} />
    </FaceBase>
  );
}

export function FaceSunscreen({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.skincare} skin={SKIN.light} hair="streak-bun" hairColor={HAIR.blonde} alt="Illustration: one hand applying lotion along the cheek, a small sun glyph, second hand near the neck" className={className}>
      <SunGlyph x={36} y={32} s={0.9} />
      <Hand x={132} y={112} r={24} flip tone={SKIN.light} />
      <circle cx="118" cy="106" r="3.5" fill="#FFF6E8" />
      <Hand x={66} y={164} r={-10} tone={SKIN.light} />
      <Arrow d="M110 112 q-8 4 -12 10" w={2} />
    </FaceBase>
  );
}

export function FaceCleansePm({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.skincare} skin={SKIN.medium} hair="wrap" hairColor="#D9C6B2" alt="Illustration: a soft cleansing pad at the cheek under a small crescent moon" className={className}>
      <MoonGlyph x={162} y={32} s={1} />
      <circle cx="126" cy="110" r="11" fill="#FFF6E8" opacity={0.95} />
      <Hand x={146} y={122} r={26} flip tone={SKIN.medium} />
      <WaveLines x={84} y={142} n={2} />
    </FaceBase>
  );
}

export function FaceBarrierReset({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.skincare} skin={SKIN.lightMed} hair="waves" hairColor={HAIR.auburn} mouth="neutral" alt="Illustration: a calm face beneath an arc of three tiny basics icons — droplet, cream jar, sun" className={className}>
      <path d="M60 44 q40 -22 80 0" fill="none" stroke={INK} strokeWidth={1.8} strokeDasharray="3 5" strokeLinecap="round" />
      <Droplet x={58} y={46} s={1} fill={CATEGORY_THEME['eye-forehead'].hue} />
      <g transform="translate(100 26)">
        <rect x="-7" y="-6" width="14" height="12" rx="3" fill="#FFF6E8" stroke={INK} strokeWidth={1.6} />
        <line x1="-7" y1="-1" x2="7" y2="-1" stroke={INK} strokeWidth={1.4} />
      </g>
      <SunGlyph x={142} y={44} s={0.8} />
    </FaceBase>
  );
}

export function FaceOneActive({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.skincare} skin={SKIN.deepRich} hair="short" hairColor={HAIR.black} eyes="open" alt="Illustration: a single dropper dispensing one drop onto the jawline patch-test zone" className={className}>
      <g transform="translate(138 66) rotate(28)">
        <rect x="-4" y="-22" width="8" height="26" rx="4" fill="#E8DCCB" stroke={INK} strokeWidth={1.6} />
        <rect x="-5.5" y="-30" width="11" height="10" rx="4" fill={COLORS.ink3} />
      </g>
      <Droplet x={128} y={96} s={0.9} fill="#E8C98A" />
      <circle cx="122" cy="112" r="6" fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="2.5 3.5" />
    </FaceBase>
  );
}

export function FaceMassageSequence({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.massage} skin={SKIN.medium} hair="ponytail" hairColor={HAIR.dark} alt="Illustration: fingertips gliding from forehead center toward temples, long curved outward arrows" className={className}>
      <Hand x={92} y={70} r={-6} tone={SKIN.medium} />
      <Arrow d="M100 62 q22 -8 38 4" />
      <Arrow d="M100 62 q-22 -8 -38 4" />
      <Arrow d="M104 108 q20 0 34 10" w={2} />
      <Arrow d="M96 108 q-20 0 -34 10" w={2} />
    </FaceBase>
  );
}

export function FaceDepuffGlide({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.massage} skin={SKIN.medium} hair="wrap" hairColor="#D9C6B2" alt="Illustration: ring fingers gliding from the inner under-eye outward to temples, then sweeping down the neck" className={className}>
      <Hand x={60} y={104} r={-40} tone={SKIN.medium} />
      <Arrow d="M88 100 q-18 -4 -34 4" w={2} />
      <Arrow d="M112 100 q18 -4 34 4" w={2} />
      <path d="M140 108 q10 10 6 24 q-4 14 -12 22" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeDasharray="2 6" />
      <Droplet x={152} y={150} s={0.8} />
      <Droplet x={46} y={126} s={0.7} />
    </FaceBase>
  );
}

export function FaceGuaSha({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.massage} skin={SKIN.light} hair="bun" hairColor={HAIR.blonde} alt="Illustration: one hand holding a flat rose-quartz stone at the jaw with three short outward pass arrows" className={className}>
      <g transform="translate(128 124) rotate(18)">
        <path d="M-16 -8 q16 -12 32 0 q-2 14 -16 14 q-14 0 -16 -14 Z" fill="#E9A8B4" stroke={INK} strokeWidth={1.8} />
      </g>
      <Hand x={148} y={136} r={30} flip tone={SKIN.light} />
      <Arrow d="M104 130 q14 2 24 10" w={2} />
      <Arrow d="M100 142 q12 2 20 8" w={2} />
      <Arrow d="M108 118 q12 0 22 6" w={2} />
    </FaceBase>
  );
}

export function FaceCheekLift({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.movement} skin={SKIN.lightMed} hair="waves" hairColor={HAIR.auburn} mouth="smile" alt="Illustration: a small gentle smile with fingertips resting on the cheek apples as light awareness points" className={className}>
      <Hand x={60} y={122} r={-24} tone={SKIN.lightMed} />
      <Hand x={140} y={122} r={24} flip tone={SKIN.lightMed} />
      <Arrow d="M74 122 q0 -8 2 -14" w={2} />
      <Arrow d="M126 122 q0 -8 -2 -14" w={2} />
    </FaceBase>
  );
}

export function FaceControlledSmile({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.movement} skin={SKIN.deep} hair="curls" hairColor={HAIR.black} eyes="open" mouth="smile" alt="Illustration: a slow even smile with two mirrored small arrows at the mouth corners" className={className}>
      <line x1="72" y1="78" x2="128" y2="78" stroke={INK} strokeWidth={1.6} strokeDasharray="3 4" opacity={0.5} />
      <Arrow d="M86 134 q-6 2 -10 -2" w={2} />
      <Arrow d="M114 134 q6 2 10 -2" w={2} />
    </FaceBase>
  );
}

export function FaceAirTransfer({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.movement} skin={SKIN.warmMed} hair="short" hairColor={HAIR.dark} alt="Illustration: one cheek gently rounded with air, a curved arrow passing to the other cheek" className={className}>
      <circle cx="76" cy="116" r="11" fill={SKIN.warmMed} stroke={INK} strokeWidth={1.8} opacity={0.9} />
      <Arrow d="M88 112 q16 -8 30 0" w={2} />
    </FaceBase>
  );
}

export function FaceOoEe({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.movement} skin={SKIN.light} hair="bob" hairColor={HAIR.silver} mouth="oo" alt="Illustration: lips in a small rounded oo, morph arrows toward a soft ee smile shape" className={className}>
      <Arrow d="M112 128 q12 -2 18 4" w={2} />
      <Arrow d="M88 140 q12 4 24 0" w={2} />
      <path d="M124 138 q6 2 10 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
    </FaceBase>
  );
}

export function FaceJawOpening({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.movement} skin={SKIN.medium} hair="wrap" hairColor="#BFA8CE" mouth="ah" alt="Illustration: jaw gently lowered a comfortable distance, a small vertical arrow beside the chin" className={className}>
      <path d="M94 122 q6 3 12 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
      <Arrow d="M146 122 q2 10 0 18" w={2} />
      <path d="M146 148 q0 -4 0 -6" stroke={INK} strokeWidth={2} strokeLinecap="round" markerEnd="url(#lf-arr)" transform="rotate(180 146 146)" />
    </FaceBase>
  );
}

export function FaceSoftEye({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.eye} skin={SKIN.deepRich} hair="hijab" hairColor="#7A6A8A" alt="Illustration: eyes gently closed, palms softly cupped over the eyes without pressure" className={className}>
      <Hand x={78} y={94} r={-14} tone={SKIN.deepRich} />
      <Hand x={122} y={94} r={14} flip tone={SKIN.deepRich} />
      <MoonGlyph x={152} y={44} s={0.7} />
      <MoonGlyph x={48} y={52} s={0.55} />
    </FaceBase>
  );
}

export function FaceBrowAwareness({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.eye} skin={SKIN.medium} hair="bob" hairColor={HAIR.chestnut} eyes="open" alt="Illustration: eyes open and natural, small downward release arrows above the brows" className={className}>
      <Arrow d="M84 70 q0 6 -2 10" w={2} />
      <Arrow d="M116 70 q0 6 2 10" w={2} />
    </FaceBase>
  );
}

export function FaceTemple({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.eye} skin={SKIN.lightMed} hair="curls" hairColor={HAIR.auburn} alt="Illustration: fingertips at the temples with small circular arrows, eyes closed and calm" className={className}>
      <Hand x={52} y={86} r={-52} tone={SKIN.lightMed} />
      <Hand x={148} y={86} r={52} flip tone={SKIN.lightMed} />
      <path d="M62 74 a10 10 0 1 1 8 10" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" markerEnd="url(#lf-arr)" />
      <path d="M138 74 a10 10 0 1 0 -8 10" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" markerEnd="url(#lf-arr)" />
    </FaceBase>
  );
}

export function FaceCoolCompress({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.eye} skin={SKIN.medium} hair="bun" hairColor={HAIR.dark} alt="Illustration: a soft folded cloth resting over closed eyes with pale-blue cool accents" className={className}>
      <rect x="64" y="84" width="72" height="22" rx="10" fill="#CFE3F2" stroke={INK} strokeWidth={1.8} />
      <line x1="70" y1="95" x2="130" y2="95" stroke={INK} strokeWidth={1.4} opacity={0.4} />
      <WaveLines x={70} y={116} color="#7FB0D9" n={2} />
      <WaveLines x={112} y={116} color="#7FB0D9" n={2} />
    </FaceBase>
  );
}

export function FaceShoulderReset({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.neck} skin={SKIN.warmMed} hair="bun" hairColor={HAIR.dark} alt="Illustration: head and shoulders mid up-back-down path with a circular arrow around each shoulder" className={className}>
      <path d="M30 176 a16 14 0 1 1 14 12" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" markerEnd="url(#lf-arr)" />
      <path d="M170 176 a16 14 0 1 0 -14 12" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" markerEnd="url(#lf-arr)" />
      <path d="M52 178 q6 -8 14 -10" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
      <path d="M148 178 q-6 -8 -14 -10" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
    </FaceBase>
  );
}

export function FaceNeckStretch({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.neck} skin={SKIN.light} hair="streak-bun" hairColor={HAIR.blonde} alt="Illustration: head gently tilted, shoulders drawn down, one long soft arrow along the stretched side" className={className}>
      <g transform="rotate(10 100 102)">
        {/* tilt is suggested by the arrow + neck lines; face stays serene */}
      </g>
      <path d="M60 130 q-6 16 -2 30" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" markerEnd="url(#lf-arr)" />
      <path d="M126 128 q8 4 14 12" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.45} />
    </FaceBase>
  );
}

export function FaceChinRetraction({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.neck} skin={SKIN.deep} hair="short" hairColor={HAIR.black} eyes="open" alt="Illustration: head gliding straight back, a horizontal double arrow at the back of the head, chin level" className={className}>
      <path d="M146 92 h22" stroke={INK} strokeWidth={2.4} strokeLinecap="round" markerEnd="url(#lf-arr)" />
      <path d="M168 104 h-22" stroke={INK} strokeWidth={2.4} strokeLinecap="round" markerEnd="url(#lf-arr)" />
      <line x1="88" y1="118" x2="112" y2="118" stroke={INK} strokeWidth={1.6} strokeDasharray="3 4" opacity={0.5} />
    </FaceBase>
  );
}

export function FaceJawRest({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.relax} skin={SKIN.medium} hair="curls" hairColor={HAIR.auburn} mouth="neutral" alt="Illustration: lips softly together with the teeth visibly apart, tiny melting wavy lines at the jaw" className={className}>
      <path d="M94 133 q6 4 12 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.6} />
      <WaveLines x={62} y={140} n={2} />
      <WaveLines x={122} y={140} n={2} />
    </FaceBase>
  );
}

export function FaceSmileRelease({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.relax} skin={SKIN.lightMed} hair="waves" hairColor={HAIR.auburn} mouth="smile" alt="Illustration: a gentle two-second smile with a soft release wave arrow returning to neutral" className={className}>
      <path d="M120 132 q12 2 14 12 q1 6 -4 8" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" markerEnd="url(#lf-arr)" />
      <WaveLines x={64} y={142} n={2} />
    </FaceBase>
  );
}

export function FaceLowerFaceRelease({ className }: IlloProps) {
  return (
    <FaceBase bg={HUE.relax} skin={SKIN.deep} hair="curls" hairColor={HAIR.black} mouth="ah" alt="Illustration: a soft relaxed ah mouth, jaw dropped loose, downward release arrows at the mouth corners" className={className}>
      <Arrow d="M84 138 q-2 8 -6 12" w={2} />
      <Arrow d="M116 138 q2 8 6 12" w={2} />
    </FaceBase>
  );
}

/* ── FaceIllo dispatcher ───────────────────────────────────────────────── */

const FACE_ILLOS: Record<string, (props: IlloProps) => ReactNode> = {
  FaceCleanseAm,
  FaceMoisturize,
  FaceSunscreen,
  FaceCleansePm,
  FaceBarrierReset,
  FaceOneActive,
  FaceMassageSequence,
  FaceDepuffGlide,
  FaceGuaSha,
  FaceCheekLift,
  FaceControlledSmile,
  FaceAirTransfer,
  FaceOoEe,
  FaceJawOpening,
  FaceSoftEye,
  FaceBrowAwareness,
  FaceTemple,
  FaceCoolCompress,
  FaceShoulderReset,
  FaceNeckStretch,
  FaceChinRetraction,
  FaceJawRest,
  FaceSmileRelease,
  FaceLowerFaceRelease,
};

/**
 * Render any illustration by name (Activity.media.illustration).
 * Unknown names fall back to the brand petal mark.
 */
export function FaceIllo({ name, className }: { name: string; className?: string }) {
  const C = FACE_ILLOS[name];
  if (!C) return <MarkPetal className={className} />;
  return <>{C({ className })}</>;
}

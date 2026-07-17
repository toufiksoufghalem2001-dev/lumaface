/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── LumaFace base palette (design.md §3.1) ───────────────────── */
        cream: { DEFAULT: '#FCFCF8', 2: '#F7F2E9', backdrop: '#F4EEE3' },
        card: '#FFFFFF',
        ink: { DEFAULT: '#2A160D', 2: '#6B584B', 3: '#A08D7C', frame: '#241309' },
        hairline: '#ECE3D6',
        /* ── Brand accents (§3.2) ─────────────────────────────────────── */
        rose: { DEFAULT: '#A8465A', deep: '#7E3145', tint: '#F7E7E6' },
        plum: '#3E1D3A',
        violet: { DEFAULT: '#6A43C9', tint: '#F0EAFB' },
        gold: '#C9A227',
        flame: '#E8862F',
        sage: { DEFAULT: '#5F8A5B', deep: '#4A6B43', tint: '#F0F5EC' },
        /* ── Category signature colors (§3.3) ─────────────────────────── */
        cat: {
          skincare: { tint: '#F7F0E2', hue: '#CBAC7A', deep: '#7A5A24' },
          massage: { tint: '#F0F5EC', hue: '#AAC6A2', deep: '#4A6B43' },
          movement: { tint: '#FBF0EB', hue: '#ECC1B4', deep: '#9C5844' },
          'eye-forehead': { tint: '#EDF4FB', hue: '#98C2E6', deep: '#2F6189' },
          'neck-posture': { tint: '#F4EFF8', hue: '#BFA8CE', deep: '#6B4E80' },
          relaxation: { tint: '#EBF5F2', hue: '#8FBFB5', deep: '#33675C' },
        },
        /* Reserved category-adjacent tints (§3.3) */
        terracotta: { tint: '#F6E9E5', hue: '#C98B7B', deep: '#6E3A2E' },
        rosepetal: { tint: '#FBEFF1', hue: '#E3A6B2', deep: '#96455C' },
        /* ── Evidence tier badge colors (§3.4) ────────────────────────── */
        tier: {
          a: { DEFAULT: '#4A6B43', bg: '#F0F5EC' },
          b: { DEFAULT: '#7A5A24', bg: '#F7F0E2' },
          c: { DEFAULT: '#6B4E80', bg: '#F4EFF8' },
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        /* design.md §4 scale */
        'display-lg': ['32px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-md': ['26px', { lineHeight: '32px', fontWeight: '600' }],
        title: ['21px', { lineHeight: '27px', fontWeight: '600' }],
        quote: ['20px', { lineHeight: '29px', fontWeight: '400' }],
        'number-xl': ['56px', { lineHeight: '60px', fontWeight: '600' }],
        'number-lg': ['34px', { lineHeight: '38px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '24px' }],
        label: ['13.5px', { lineHeight: '20px', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '17px' }],
        eyebrow: ['11px', { lineHeight: '14px', letterSpacing: '0.14em', fontWeight: '700' }],
      },
      borderRadius: {
        card: '22px',
        tile: '16px',
        sheet: '28px',
        arch: '140px 140px 18px 18px',
        'arch-lg': '200px 200px 24px 24px',
        petal: '62% 38% 55% 45% / 55% 48% 52% 45%',
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,22,13,.05), 0 12px 32px -20px rgba(42,22,13,.22)',
        pop: '0 10px 30px -12px rgba(42,22,13,.28)',
        'glow-rose': '0 12px 28px -10px rgba(168,70,90,.45)',
        'glow-gold': '0 6px 18px -6px rgba(201,162,39,.5)',
        device: '0 40px 90px -30px rgba(42,22,13,.45)',
      },
      transitionTimingFunction: {
        signature: 'cubic-bezier(.785,.135,.15,.86)',
        'out-soft': 'cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        'halo-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(168,70,90,.22)' },
          '100%': { boxShadow: '0 0 0 18px rgba(168,70,90,0)' },
        },
        'dot-pulse': {
          '0%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-3px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'halo-pulse': 'halo-pulse 1.9s ease-in-out infinite',
        'dot-pulse': 'dot-pulse 1.2s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

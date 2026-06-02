// theme.jsx — SchoolMate Staff design system tokens
// Exports to window: makeTheme, ROLES, useStagger

// ── Role identities ───────────────────────────────────────────
// Each role: accent hue varied, chroma/lightness kept close for harmony.
const ROLES = {
  driver:   { key: 'driver',   label: 'Bus Driver', hi: 'बस चालक',   icon: 'bus',     accent: '#E08A3C', accentSoft: '#FBE7CC' },
  cook:     { key: 'cook',     label: 'Cook',       hi: 'रसोइया',     icon: 'pot',     accent: '#DD5A4B', accentSoft: '#FAD8D2' },
  guard:    { key: 'guard',    label: 'Watchman',   hi: 'चौकीदार',    icon: 'shield',  accent: '#3B7FD4', accentSoft: '#D2E2F7' },
  gardener: { key: 'gardener', label: 'Gardener',   hi: 'माली',       icon: 'leaf',    accent: '#4C9E55', accentSoft: '#D6Ecd6' },
  sweeper:  { key: 'sweeper',  label: 'Sweeper',    hi: 'सफाईकर्मी',  icon: 'broom',   accent: '#23A79C', accentSoft: '#CCECE8' },
  peon:     { key: 'peon',     label: 'Peon',       hi: 'चपरासी',     icon: 'bell',    accent: '#8A6ED4', accentSoft: '#E2D9F6' },
  clerk:    { key: 'clerk',    label: 'Clerk',      hi: 'लिपिक',      icon: 'doc',     accent: '#5566CE', accentSoft: '#D7DBF6' },
};

// ── Theme tokens ──────────────────────────────────────────────
function makeTheme(dark) {
  if (!dark) {
    return {
      dark: false,
      bg:        '#F2EEE4',   // warm cream paper
      bgInk:     '#0E5C4A',   // deep brand surfaces (login, headers)
      surface:   '#FFFFFF',
      surface2:  '#FBF9F3',   // subtle raised
      sunken:    '#EBE6D9',   // wells / tracks
      ink:       '#15231E',
      inkSoft:   '#5E6E66',
      inkFaint:  '#94A199',
      line:      'rgba(21,35,30,0.08)',
      lineStrong:'rgba(21,35,30,0.14)',
      primary:   '#0E5C4A',
      primaryDim:'#15735C',
      onPrimary: '#FFFFFF',
      gold:      '#E7A92F',
      goldSoft:  '#FBEAC2',
      success:   '#2E9E6B',
      successSoft:'#D4EFE0',
      danger:    '#DA5347',
      dangerSoft:'#F8DAD5',
      warn:      '#E0922F',
      warnSoft:  '#FBE6C6',
      shadow:    '0 1px 2px rgba(21,35,30,0.05), 0 8px 24px -8px rgba(21,35,30,0.16)',
      shadowLg:  '0 2px 6px rgba(21,35,30,0.06), 0 22px 50px -16px rgba(21,35,30,0.28)',
      onBrandSoft:'rgba(255,255,255,0.14)',
    };
  }
  return {
    dark: true,
    bg:        '#0B1512',
    bgInk:     '#0B1512',
    surface:   '#14241E',
    surface2:  '#1A2C25',
    sunken:    '#0E1B16',
    ink:       '#ECF3EF',
    inkSoft:   '#9CB0A7',
    inkFaint:  '#647A71',
    line:      'rgba(255,255,255,0.07)',
    lineStrong:'rgba(255,255,255,0.13)',
    primary:   '#33BF9F',
    primaryDim:'#2AA489',
    onPrimary: '#04241C',
    gold:      '#F2C766',
    goldSoft:  'rgba(242,199,102,0.16)',
    success:   '#45C589',
    successSoft:'rgba(69,197,137,0.16)',
    danger:    '#F0786C',
    dangerSoft:'rgba(240,120,108,0.16)',
    warn:      '#F0B560',
    warnSoft:  'rgba(240,181,96,0.16)',
    shadow:    '0 1px 2px rgba(0,0,0,0.4), 0 10px 28px -10px rgba(0,0,0,0.6)',
    shadowLg:  '0 2px 8px rgba(0,0,0,0.5), 0 24px 56px -18px rgba(0,0,0,0.7)',
    onBrandSoft:'rgba(255,255,255,0.10)',
  };
}

// ── tiny entrance-stagger hook ────────────────────────────────
// returns a style obj for index i that animates in once `on` is true
// NOTE: content stays visible (opacity 1) even before `on` flips — only the
// position animates. This guarantees no blank/invisible state if the entrance
// frame is ever throttled (background tab, low-end device, capture context).
function useStagger(on, i, { y = 16, delay = 65, dur = 480 } = {}) {
  return {
    transform: on ? 'translateY(0)' : `translateY(${y}px)`,
    transition: `transform ${dur}ms cubic-bezier(.2,.7,.2,1) ${i * delay}ms`,
    willChange: 'transform',
  };
}

Object.assign(window, { makeTheme, ROLES, useStagger });

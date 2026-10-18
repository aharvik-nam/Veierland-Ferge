import type { Theme, ThemeKey, VisualStyle, StyleKey } from './types';

export const THEMES: Record<ThemeKey, Theme> = {
  fjord: {
    label: 'Fjord', deep: '#07313C', deep2: '#0E5365',
    onDeep: '#EAF6F2', onDeepDim: 'rgba(234,246,242,0.60)',
    surface: '#FBF6EA', surfaceAlt: '#F0E7D2', ink: '#15302E', inkDim: '#5E6E69',
    line: 'rgba(21,48,46,0.10)', accent: '#E2613B', accentInk: '#FFF7F2', accentOnDeep: '#F2875F',
    accent2: '#4FA39A', good: '#2E8B6F', warn: '#C77A16', bad: '#D4503B',
    swatch: ['#07313C', '#E2613B', '#FBF6EA'],
  },
  // Mørk modus: mørke flater og lys tekst overalt
  driftwood: {
    label: 'Driftwood ☾', deep: '#191A14', deep2: '#2B2C22',
    onDeep: '#EEEDE2', onDeepDim: 'rgba(238,237,226,0.62)',
    surface: '#2C2D24', surfaceAlt: '#22231C', ink: '#EEEDE2', inkDim: '#A9A894',
    line: 'rgba(238,237,226,0.12)', accent: '#E39A86', accentInk: '#2A1814', accentOnDeep: '#E39A86',
    accent2: '#A7B37C', good: '#8FB86C', warn: '#E2AA4E', bad: '#EE7A70', onStatus: '#1F1A15',
    waves: ['rgba(238,237,226,0.04)', 'rgba(238,237,226,0.07)', 'rgba(238,237,226,0.10)'],
    swatch: ['#191A14', '#E39A86', '#2C2D24'],
  },
  midnattsol: {
    label: 'Midnattsol', deep: '#241B33', deep2: '#532F4E',
    onDeep: '#F7EAF1', onDeepDim: 'rgba(247,234,241,0.60)',
    surface: '#FDF3EC', surfaceAlt: '#F6E2D6', ink: '#2C2233', inkDim: '#6E5F70',
    line: 'rgba(44,34,51,0.10)', accent: '#F2784B', accentInk: '#2C1420', accentOnDeep: '#F2784B',
    accent2: '#C9577E', good: '#4F9E78', warn: '#D98A2A', bad: '#D85070',
    swatch: ['#241B33', '#F2784B', '#FDF3EC'],
  },
  lanterne: {
    label: 'Lanterne', deep: '#102539', deep2: '#1C476B',
    onDeep: '#E9F1F8', onDeepDim: 'rgba(233,241,248,0.60)',
    surface: '#FFFFFF', surfaceAlt: '#EDF2F8', ink: '#112338', inkDim: '#5A6B7E',
    line: 'rgba(17,35,56,0.10)', accent: '#D31E36', accentInk: '#FFF1F2', accentOnDeep: '#FF6B7D',
    accent2: '#2E6E9E', good: '#1F8A5B', warn: '#D08612', bad: '#D31E36',
    swatch: ['#102539', '#D31E36', '#FFFFFF'],
  },
};

export const STYLES: Record<StyleKey, VisualStyle> = {
  sjokart: { label: 'Sjøkart', numeral: 'serif', texture: true, radius: 26 },
  tavle: { label: 'Tavle', numeral: 'mono', texture: false, radius: 13 },
  mykt: { label: 'Mykt', numeral: 'serif', texture: false, radius: 34 },
};

const SERIF = "'Instrument Serif', 'Times New Roman', serif";
const MONO = "'Space Mono', ui-monospace, monospace";

export function themeVars(theme: Theme, style: VisualStyle): Record<string, string> {
  const num = style.numeral === 'mono' ? MONO : SERIF;
  return {
    '--deep': theme.deep, '--deep2': theme.deep2,
    '--onDeep': theme.onDeep, '--onDeepDim': theme.onDeepDim,
    '--surface': theme.surface, '--surfaceAlt': theme.surfaceAlt,
    '--ink': theme.ink, '--inkDim': theme.inkDim,
    '--line': theme.line, '--accent': theme.accent, '--accentInk': theme.accentInk, '--accentOnDeep': theme.accentOnDeep,
    '--accent2': theme.accent2, '--good': theme.good, '--warn': theme.warn, '--bad': theme.bad,
    '--onStatus': theme.onStatus ?? '#fff',
    '--wave1': theme.waves?.[0] ?? 'rgba(255,255,255,0.10)',
    '--wave2': theme.waves?.[1] ?? 'rgba(255,255,255,0.16)',
    '--wave3': theme.waves?.[2] ?? 'rgba(255,255,255,0.26)',
    '--num': num,
    '--rad': style.radius + 'px',
    '--radSm': Math.max(8, style.radius - 10) + 'px',
  };
}


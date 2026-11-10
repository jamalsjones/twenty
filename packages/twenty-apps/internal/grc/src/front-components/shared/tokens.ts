// Twenty's theme is exposed to front components as CSS variables on the host
// page, so referencing them keeps widgets in sync with light and dark mode.
const cssVariable = (name: string) => `var(--t-${name})`;

export type Tone =
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'blue'
  | 'gray'
  | 'purple'
  | 'sky'
  | 'turquoise';

export const TOKENS = {
  font: {
    primary: cssVariable('font-color-primary'),
    secondary: cssVariable('font-color-secondary'),
    tertiary: cssVariable('font-color-tertiary'),
    light: cssVariable('font-color-light'),
  },
  size: {
    xs: cssVariable('font-size-xs'),
    sm: cssVariable('font-size-sm'),
    md: cssVariable('font-size-md'),
    lg: cssVariable('font-size-lg'),
    xl: cssVariable('font-size-xl'),
  },
  weight: {
    medium: cssVariable('font-weight-medium'),
    semiBold: cssVariable('font-weight-semi-bold'),
  },
  background: {
    primary: cssVariable('background-primary'),
    secondary: cssVariable('background-secondary'),
    tertiary: cssVariable('background-tertiary'),
    hover: cssVariable('background-transparent-light'),
  },
  border: {
    light: cssVariable('border-color-light'),
    medium: cssVariable('border-color-medium'),
  },
  radius: {
    sm: cssVariable('border-radius-sm'),
    md: cssVariable('border-radius-md'),
    pill: cssVariable('border-radius-pill'),
  },
  accent: cssVariable('color-blue'),
} as const;

export const tagBackground = (tone: Tone) =>
  cssVariable(`tag-background-${tone}`);
export const tagText = (tone: Tone) => cssVariable(`tag-text-${tone}`);
export const solid = (tone: Tone, step = 9) =>
  cssVariable(`color-${tone}${step}`);

export const LEVEL_TONE: Record<string, Tone> = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export const LEVEL_LABEL: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

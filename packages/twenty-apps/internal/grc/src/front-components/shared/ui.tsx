import { type CSSProperties, type ReactNode } from 'react';

import { solid, tagBackground, tagText, TOKENS, type Tone } from './tokens';

type ChildrenProps = { children: ReactNode };

export const Panel = ({
  children,
  style,
}: ChildrenProps & { style?: CSSProperties }) => (
  <div
    style={{
      boxSizing: 'border-box',
      height: '100%',
      overflow: 'auto',
      padding: 16,
      color: TOKENS.font.primary,
      fontSize: TOKENS.size.md,
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Card = ({
  children,
  style,
}: ChildrenProps & { style?: CSSProperties }) => (
  <div
    style={{
      border: `1px solid ${TOKENS.border.medium}`,
      borderRadius: TOKENS.radius.md,
      background: TOKENS.background.secondary,
      padding: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

export const SectionTitle = ({
  children,
  aside,
}: ChildrenProps & { aside?: ReactNode }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    }}
  >
    <div
      style={{
        fontSize: TOKENS.size.sm,
        fontWeight: TOKENS.weight.semiBold,
        color: TOKENS.font.secondary,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </div>
    {aside}
  </div>
);

export const Muted = ({ children }: ChildrenProps) => (
  <span style={{ color: TOKENS.font.tertiary, fontSize: TOKENS.size.sm }}>
    {children}
  </span>
);

export const Pill = ({ tone, children }: ChildrenProps & { tone: Tone }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 8px',
      borderRadius: TOKENS.radius.sm,
      background: tagBackground(tone),
      color: tagText(tone),
      fontSize: TOKENS.size.sm,
      fontWeight: TOKENS.weight.medium,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

type ProgressBarProps = {
  segments: { value: number; tone: Tone }[];
  total: number;
  height?: number;
};

export const ProgressBar = ({
  segments,
  total,
  height = 8,
}: ProgressBarProps) => (
  <div
    style={{
      display: 'flex',
      height,
      borderRadius: TOKENS.radius.pill,
      overflow: 'hidden',
      background: TOKENS.background.tertiary,
    }}
  >
    {segments.map((segment, index) => (
      <div
        key={index}
        style={{
          width: `${total > 0 ? (segment.value / total) * 100 : 0}%`,
          background: solid(segment.tone),
        }}
      />
    ))}
  </div>
);

type StatProps = {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
};

export const Stat = ({ label, value, tone, hint }: StatProps) => (
  <Card style={{ flex: '1 1 120px', minWidth: 120 }}>
    <div style={{ color: TOKENS.font.tertiary, fontSize: TOKENS.size.sm }}>
      {label}
    </div>
    <div
      style={{
        fontSize: 24,
        fontWeight: TOKENS.weight.semiBold,
        color: tone ? solid(tone, 11) : TOKENS.font.primary,
        lineHeight: 1.3,
      }}
    >
      {value}
    </div>
    {hint ? <Muted>{hint}</Muted> : null}
  </Card>
);

type ActionButtonProps = ChildrenProps & {
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  isDisabled?: boolean;
};

export const ActionButton = ({
  children,
  onClick,
  variant = 'secondary',
  isDisabled = false,
}: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isDisabled}
    style={{
      height: 28,
      padding: '0 10px',
      borderRadius: TOKENS.radius.sm,
      border: `1px solid ${variant === 'primary' ? TOKENS.accent : TOKENS.border.medium}`,
      background:
        variant === 'primary' ? TOKENS.accent : TOKENS.background.primary,
      color: variant === 'primary' ? '#fff' : TOKENS.font.secondary,
      fontSize: TOKENS.size.sm,
      fontWeight: TOKENS.weight.medium,
      fontFamily: 'inherit',
      cursor: isDisabled ? 'default' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

type RowLinkProps = ChildrenProps & { onClick: () => void };

export const RowLink = ({ children, onClick }: RowLinkProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === 'Enter') onClick();
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      borderRadius: TOKENS.radius.sm,
      cursor: 'pointer',
      borderBottom: `1px solid ${TOKENS.border.light}`,
    }}
  >
    {children}
  </div>
);

type LoadStateProps = { isLoading: boolean; error: string | null };

export const LoadState = ({ isLoading, error }: LoadStateProps) => {
  if (error) {
    return (
      <Panel>
        <Pill tone="red">Could not load</Pill>
        <Muted>{error}</Muted>
      </Panel>
    );
  }

  return isLoading ? (
    <Panel>
      <Muted>Loading…</Muted>
    </Panel>
  ) : null;
};

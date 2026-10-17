import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

function Svg({ size = 20, strokeWidth = 2, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const Dot = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);

/** Würfel mit fünf Augen (Kopfzeile). */
export function DiceIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <Dot cx={8.6} cy={8.6} r={1.3} />
      <Dot cx={15.4} cy={8.6} r={1.3} />
      <Dot cx={12} cy={12} r={1.3} />
      <Dot cx={8.6} cy={15.4} r={1.3} />
      <Dot cx={15.4} cy={15.4} r={1.3} />
    </Svg>
  );
}

/** Würfel mit drei Augen (Button «Neues Wort»). */
export function DiceSmallIcon({ size = 17, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <Dot cx={8.6} cy={8.6} r={1.4} />
      <Dot cx={12} cy={12} r={1.4} />
      <Dot cx={15.4} cy={15.4} r={1.4} />
    </Svg>
  );
}

export function CheckIcon({ size = 15, strokeWidth = 3 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Svg>
  );
}

/** Doppelpfeil ⇄: im Wort, andere Stelle. */
export function SwapIcon({ size = 15, strokeWidth = 2.8 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <path d="M5 8h13" />
      <path d="M14.5 4.5L18 8l-3.5 3.5" />
      <path d="M19 16H6" />
      <path d="M9.5 12.5L6 16l3.5 3.5" />
    </Svg>
  );
}

export function CrossIcon({ size = 15, strokeWidth = 3 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <path d="M7 7l10 10" />
      <path d="M17 7L7 17" />
    </Svg>
  );
}

/** ↵ Prüfen */
export function EnterIcon({ size = 20, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <path d="M20 5v6.5a3 3 0 0 1-3 3H6" />
      <path d="M10 10.5l-4 4 4 4" />
    </Svg>
  );
}

/** ⌫ Löschen */
export function BackspaceIcon({ size = 22, strokeWidth = 2 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z" />
      <path d="M12.5 9.5l5 5M17.5 9.5l-5 5" />
    </Svg>
  );
}

/** Neutrales Icon der Verloren-Karte: Das Wort wird gezeigt. */
export function EyeIcon({ size = 19, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </Svg>
  );
}

/** «!» für Meldungen. */
export function AlertIcon({ size = 16, strokeWidth = 3 }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <path d="M12 6.5v7" />
      <path d="M12 17.6h.01" />
    </Svg>
  );
}

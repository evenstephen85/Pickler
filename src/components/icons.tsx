import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function BackIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth={2} />
      <path d="M12 10.5V17" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="12" cy="7.25" r="1.4" fill={color} />
    </svg>
  );
}

export function SoundOnIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M4 9.5V14.5H7.5L12 18.5V5.5L7.5 9.5H4Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M15.5 9C16.5 10 16.5 14 15.5 15M18 6.5C20 8.5 20 15.5 18 17.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function SoundOffIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M4 9.5V14.5H7.5L12 18.5V5.5L7.5 9.5H4Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <path d="M16 10L21 15M21 10L16 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

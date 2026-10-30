import type React from 'react';
import type { MiddleSchoolGrade, ReadingCellStatus } from '../../types';

/**
 * Masiri design tokens for the readings feature (burgundy primary, gold accent),
 * resolved for the active theme. Mirrors the values in src/index.css and the
 * inline theme styling used by the existing dashboards.
 */
export function readingPalette(theme: 'light' | 'dark') {
  const dark = theme === 'dark';
  return {
    dark,
    text: dark ? '#F5F1F0' : '#272329',
    muted: dark ? '#B8B1BB' : '#77717A',
    faint: dark ? '#89828D' : '#99939A',
    primary: '#76243A',
    primaryHover: dark ? '#541424' : '#5D192D',
    accent: dark ? '#D6B878' : '#C5A15A',
    accentText: dark ? '#F3DEAB' : '#76243A',
    soft: dark ? 'rgba(56, 35, 44, 0.8)' : '#F3E7EB',
    softBorder: dark ? 'rgba(214, 184, 120, 0.45)' : '#DFC0CA',
    goldSoft: dark ? '#342D20' : '#F6F0E3',
    border: dark ? 'rgba(214, 184, 120, 0.22)' : '#E7E2E0',
    divider: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    surface: dark ? 'rgba(32, 24, 34, 0.96)' : '#FFFFFF',
    surfaceAlt: dark ? 'rgba(41, 36, 47, 0.75)' : '#F8F7F4',
    overlay: dark ? 'rgba(10, 8, 12, 0.72)' : 'rgba(39, 35, 41, 0.45)',
    success: dark ? '#75C695' : '#347653',
    successSoft: dark ? '#20352A' : '#E9F4EC',
    warning: dark ? '#E4B45E' : '#A96F19',
    warningSoft: dark ? '#392F1D' : '#FBF2DE',
    error: dark ? '#F08089' : '#B33B49',
    errorSoft: dark ? '#3D242A' : '#F9E9EB',
    info: dark ? '#83B9E5' : '#356D9A',
    infoSoft: dark ? '#1E2D3B' : '#EAF2F9',
  };
}

export type ReadingPalette = ReturnType<typeof readingPalette>;

export function primaryButtonStyle(p: ReadingPalette): React.CSSProperties {
  return {
    background: p.dark
      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
    color: p.dark ? '#F3DEAB' : '#FFFFFF',
    border: p.dark ? '1px solid rgba(214, 184, 120, 0.45)' : '1px solid transparent',
  };
}

export function secondaryButtonStyle(p: ReadingPalette): React.CSSProperties {
  return {
    backgroundColor: p.dark ? 'rgba(42, 39, 48, 0.72)' : 'rgba(255, 255, 255, 0.85)',
    color: p.accentText,
    border: `1px solid ${p.border}`,
  };
}

export function chipStyle(p: ReadingPalette, active: boolean): React.CSSProperties {
  return {
    backgroundColor: active ? p.soft : 'transparent',
    color: active ? p.accentText : p.muted,
    border: `1px solid ${active ? p.softBorder : p.border}`,
  };
}

export const GRADE_LABELS: Record<MiddleSchoolGrade, string> = {
  'grade-1': 'الصف السابع (أولى إعدادي)',
  'grade-2': 'الصف الثامن (تانية إعدادي)',
  'grade-3': 'الصف التاسع (تالتة إعدادي)',
};

export const GRADE_SHORT_LABELS: Record<MiddleSchoolGrade, string> = {
  'grade-1': 'أولى إعدادي',
  'grade-2': 'تانية إعدادي',
  'grade-3': 'تالتة إعدادي',
};

export function statusVisual(p: ReadingPalette, status: ReadingCellStatus) {
  switch (status) {
    case 'completed':
      return { label: 'تمت القراءة', color: p.success, background: p.successSoft };
    case 'incomplete':
      return { label: 'لم تُقرأ بعد', color: p.warning, background: p.warningSoft };
    case 'overdue':
      return { label: 'فائتة', color: p.error, background: p.errorSoft };
    case 'upcoming':
      return { label: 'قادمة', color: p.info, background: p.infoSoft };
    default:
      return { label: 'غير مُكلَّف', color: p.faint, background: 'transparent' };
  }
}

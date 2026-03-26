import { useEffect, useMemo, useState } from 'react';
import { safeLocalStorage } from '@/utils/safeStorage';

export type ReportBrandingState = Readonly<{
  logoDataUrl: string | null;
  showLogo: boolean;
  paperLetterhead: boolean;
}>;

const defaultState: ReportBrandingState = {
  logoDataUrl: null,
  showLogo: true,
  paperLetterhead: false,
};

type StoredBranding = Partial<{
  logoDataUrl: string | null;
  showLogo: boolean;
  paperLetterhead: boolean;
}>;

const isValidDataUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return value.startsWith('data:image/');
};

export function useReportBranding(teamId?: string) {
  const storageKey = useMemo(() => {
    return teamId ? `report_branding:${teamId}` : 'report_branding';
  }, [teamId]);

  const [state, setState] = useState<ReportBrandingState>(() => {
    const raw = safeLocalStorage.getItem(storageKey);
    if (!raw) return defaultState;
    try {
      const parsed: unknown = JSON.parse(raw);
      const p = parsed as StoredBranding;
      return {
        logoDataUrl: isValidDataUrl(p.logoDataUrl) ? p.logoDataUrl : null,
        showLogo: typeof p.showLogo === 'boolean' ? p.showLogo : defaultState.showLogo,
        paperLetterhead:
          typeof p.paperLetterhead === 'boolean' ? p.paperLetterhead : defaultState.paperLetterhead,
      };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    safeLocalStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const setLogoDataUrl = (logoDataUrl: string | null) => {
    setState((prev) => ({ ...prev, logoDataUrl }));
  };

  const setShowLogo = (showLogo: boolean) => {
    setState((prev) => ({ ...prev, showLogo }));
  };

  const setPaperLetterhead = (paperLetterhead: boolean) => {
    setState((prev) => ({ ...prev, paperLetterhead }));
  };

  return {
    branding: state,
    setLogoDataUrl,
    setShowLogo,
    setPaperLetterhead,
  };
}


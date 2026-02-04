export const stripUrlQuery = (url: string): string => {
  const idx = url.indexOf('?');
  return idx >= 0 ? url.slice(0, idx) : url;
};

export const extractUrlFileName = (url: string): string | null => {
  const withoutQuery = stripUrlQuery(url);
  try {
    const parsed = new URL(withoutQuery);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  } catch {
    const parts = withoutQuery.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }
};
